import { describe, expect, it } from 'vitest'
import { OFFER_CODE_HELP, offerChanges, offerError, offerErrors, offerForm, offerHasErrors, offerMinCents, offerNotice, offerState, parseSlots, totalBelowUsed } from './logic'
import type { LaunchOffer, LaunchOfferResult } from './types'

const offer = (over: Partial<LaunchOffer> = {}): LaunchOffer => ({
  id: 1, isActive: true, active: true, priceCents: 7900, listPriceCents: 9900, currency: 'USD',
  totalSlots: 100, slotsUsed: 30, slotsPaid: 28, slotsAdjustment: 2, slotsHeld: 3, slotsLeft: 67, ...over,
})

describe('offerState', () => {
  it('tells active, sold out, inactive and closed', () => {
    expect(offerState(offer()).key).toBe('active')
    expect(offerState(offer({ active: false, slotsLeft: 0 })).label).toBe('Agotada')
    expect(offerState(offer({ isActive: false, active: false })).key).toBe('inactive')
    expect(offerState(offer({ active: false, slotsLeft: 5 })).key).toBe('closed')
  })
})

describe('slots and form', () => {
  it('parses whole slot counts only', () => {
    expect(parseSlots(' 100 ')).toBe(100)
    expect(parseSlots('100000')).toBe(100000)
    expect(parseSlots('100001')).toBeNull()
    expect(parseSlots('1.5')).toBeNull()
    expect(parseSlots('')).toBeNull()
  })

  it('fills the form from the offer, or empty', () => {
    expect(offerForm(offer())).toEqual({ price: '79', totalSlots: '100', slotsUsed: '30', allowBelowUsed: false })
    expect(offerForm(null).price).toBe('')
  })

  it('the minimum is half of the list price, never under 50 cents', () => {
    expect(offerMinCents(9900)).toBe(4950)
    expect(offerMinCents(60)).toBe(50)
  })
})

describe('offerErrors', () => {
  const ok = offerForm(offer())
  it('accepts the current values', () => {
    expect(offerHasErrors(offerErrors(ok, offer(), 9900))).toBe(false)
  })
  it('rejects a price that is not a discount, too low or not a number', () => {
    expect(offerErrors({ ...ok, price: '99' }, offer(), 9900).price).toContain('menor que el precio normal')
    expect(offerErrors({ ...ok, price: '20' }, offer(), 9900).price).toContain('la mitad')
    expect(offerErrors({ ...ok, price: 'x' }, offer(), 9900).price).toContain('importe')
  })
  it('rejects bad totals and used below the paid purchases', () => {
    expect(offerErrors({ ...ok, totalSlots: '-1' }, offer(), 9900).totalSlots).toContain('entero')
    expect(offerErrors({ ...ok, slotsUsed: '27' }, offer(), 9900).slotsUsed).toContain('28')
    expect(offerErrors({ ...ok, slotsUsed: 'a' }, offer(), 9900).slotsUsed).toContain('entero')
  })
  it('does not check used slots when creating', () => {
    expect(offerErrors({ price: '79', totalSlots: '100', slotsUsed: '', allowBelowUsed: false }, null, 9900).slotsUsed).toBe('')
  })
})

describe('totalBelowUsed / offerChanges', () => {
  it('flags a total under the used slots', () => {
    expect(totalBelowUsed({ ...offerForm(offer()), totalSlots: '10' }, offer())).toBe(true)
    expect(totalBelowUsed(offerForm(offer()), offer())).toBe(false)
    expect(totalBelowUsed({ ...offerForm(null), totalSlots: '10' }, null)).toBe(false)
    expect(totalBelowUsed({ ...offerForm(offer()), totalSlots: 'x' }, offer())).toBe(false)
  })
  it('sends only what changed', () => {
    expect(offerChanges(offerForm(offer()), offer())).toEqual({})
    expect(offerChanges({ ...offerForm(offer()), price: '69', slotsUsed: '31' }, offer())).toEqual({ priceCents: 6900, slotsUsed: 31 })
  })
  it('sends allowBelowUsed only with a change', () => {
    expect(offerChanges({ ...offerForm(offer()), allowBelowUsed: true }, offer())).toEqual({})
    expect(offerChanges({ ...offerForm(offer()), totalSlots: '20', allowBelowUsed: true }, offer())).toEqual({ totalSlots: 20, allowBelowUsed: true })
  })
  it('creating sends price and total', () => {
    expect(offerChanges({ price: '79', totalSlots: '100', slotsUsed: '', allowBelowUsed: false }, null)).toEqual({ priceCents: 7900, totalSlots: 100 })
  })
})

describe('offerError', () => {
  const http = (status: number, data: unknown) => ({ response: { status, data } })
  it('says it when reauth was cancelled', () => {
    expect(offerError({ reauthCancelled: true }, 'x')).toContain('contraseña')
  })
  it('maps 403 with and without reauth', () => {
    expect(offerError(http(403, { code: 'reauth_required' }), 'x')).toContain('confirmar tu contraseña')
    expect(offerError(http(403, { message: 'Forbidden' }), 'x')).toContain('No tienes permiso')
  })
  it('maps 422 codes and the 409 conflict', () => {
    expect(offerError(http(422, { errors: { slotsUsed: ['below_paid_purchases'] } }), 'x')).toBe(OFFER_CODE_HELP.below_paid_purchases)
    expect(offerError(http(422, { errors: { totalSlots: ['below_used_slots'] } }), 'x')).toBe(OFFER_CODE_HELP.below_used_slots)
    expect(offerError(http(422, { errors: { priceCents: ['required_to_create_offer'] } }), 'x')).toBe(OFFER_CODE_HELP.required_to_create_offer)
    expect(offerError(http(409, { code: 'launch_offer_conflict' }), 'x')).toBe(OFFER_CODE_HELP.launch_offer_conflict)
  })
  it('falls back to the validation message, then the fallback', () => {
    expect(offerError(http(422, { errors: { reason: ['Falta el motivo.'] } }), 'x')).toBe('Falta el motivo.')
    expect(offerError(new Error('boom'), 'No se pudo')).toBe('No se pudo')
  })
})

describe('offerNotice', () => {
  const result = (over: Partial<LaunchOfferResult> = {}): LaunchOfferResult => ({ ...offer(), sessionsClosed: 0, sessionsStillOpen: 0, ...over })
  it('names the action', () => {
    expect(offerNotice(result(), 'activate')).toBe('Oferta activada.')
    expect(offerNotice(result(), 'create')).toBe('Oferta creada.')
    expect(offerNotice(result(), 'update')).toBe('Oferta actualizada.')
  })
  it('reports checkouts closed and still open, singular and plural', () => {
    expect(offerNotice(result({ sessionsClosed: 1 }), 'deactivate')).toBe('Oferta desactivada. Se cerró 1 pago en curso.'.replace('Se cerró', 'Se cerraron'))
    expect(offerNotice(result({ sessionsClosed: 2, sessionsStillOpen: 1 }), 'update')).toContain('2 pagos en curso')
    expect(offerNotice(result({ sessionsStillOpen: 1 }), 'update')).toContain('1 pago no se pudo cerrar y sigue abierto')
    expect(offerNotice(result({ sessionsStillOpen: 2 }), 'update')).toContain('2 pagos no se pudieron cerrar y siguen abiertos')
  })
})
