import { describe, expect, it } from 'vitest'
import { CODE_HELP, STATUS, actionError, buildParams, canSync, disputeIsOpen, disputeLabel, emptyFilters, extraFilterCount, hasAnyFilter, refundBlockReason, refundError } from './logic'

describe('filters', () => {
  it('sends disputed and needsReview only when on', () => {
    expect(buildParams(emptyFilters(), 1, 15)).toMatchObject({ disputed: undefined, needsReview: undefined })
    const f = { ...emptyFilters(), disputed: true, needsReview: true, status: 'chargeback' as const }
    expect(buildParams(f, 2, 15)).toMatchObject({ page: 2, status: 'chargeback', disputed: 1, needsReview: 1 })
  })

  it('counts the new switches as extra filters', () => {
    const f = { ...emptyFilters(), disputed: true }
    expect(extraFilterCount(f)).toBe(1)
    expect(hasAnyFilter(f)).toBe(true)
    expect(hasAnyFilter(emptyFilters())).toBe(false)
  })
})

describe('states', () => {
  it('has a chargeback state', () => {
    expect(STATUS.chargeback.label).toBe('Contracargo')
  })

  it('labels disputes, with a fallback for unknown ones', () => {
    expect(disputeLabel(null)).toBeNull()
    expect(disputeLabel('won')?.color).toBe('success')
    expect(disputeLabel('weird')?.label).toBe('Disputa: weird')
  })

  it('knows which disputes are still open', () => {
    expect(disputeIsOpen('needs_response')).toBe(true)
    expect(disputeIsOpen('under_review')).toBe(true)
    expect(disputeIsOpen('lost')).toBe(false)
    expect(disputeIsOpen('won')).toBe(false)
    expect(disputeIsOpen(null)).toBe(false)
  })

  it('syncs only Stripe purchases', () => {
    expect(canSync({ gateway: 'stripe' })).toBe(true)
    expect(canSync({ gateway: 'manual' })).toBe(false)
    expect(canSync({ gateway: 'fake' })).toBe(false)
  })
})

describe('errors', () => {
  const http = (status: number, data: object) => ({ response: { status, data } })

  it('explains the refund codes, including the gateway error', () => {
    expect(refundError(['event_published'], 'x')).toBe(CODE_HELP.event_published)
    expect(refundError(['not_paid'], 'x')).toBe(CODE_HELP.not_paid)
    expect(refundError(['gateway_error'], 'x')).toBe(CODE_HELP.gateway_error)
    expect(refundError(['other'], 'fallback')).toBe('fallback')
  })

  it('turns a 502 into the Stripe message, whatever the server says', () => {
    expect(actionError(http(502, { message: 'Stripe is down', code: 'gateway_error' }), 'f')).toContain('Stripe no respondió')
    expect(actionError(http(502, { message: 'Bad gateway' }), 'f')).toContain('Stripe no respondió')
  })

  it('reads a 422 purchase code or a {code} body', () => {
    expect(actionError(http(422, { message: 'x', errors: { purchase: ['not_paid'] } }), 'f')).toBe(CODE_HELP.not_paid)
    expect(actionError(http(409, { message: 'x', code: 'not_needs_review' }), 'f')).toBe(CODE_HELP.not_needs_review)
  })

  it('falls back to the validation message, then the fallback', () => {
    expect(actionError(http(422, { message: 'm', errors: { reason: ['Falta el motivo.'] } }), 'f')).toBe('Falta el motivo.')
    expect(actionError(new Error('network'), 'f')).toBe('f')
  })

  it('says so when the password was not confirmed', () => {
    expect(actionError({ reauthCancelled: true }, 'f')).toContain('contraseña')
  })

  it('shows why a paid purchase cannot be refunded', () => {
    expect(refundBlockReason({ status: 'paid', canRefund: false })).toBe(CODE_HELP.event_published)
    expect(refundBlockReason({ status: 'paid', canRefund: true })).toBeNull()
    expect(refundBlockReason({ status: 'chargeback', canRefund: false })).toBeNull()
  })
})
