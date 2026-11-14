import { describe, expect, it } from 'vitest'
import { ACTION_FILTERS, ACTION_LABELS, actionLabel, fieldLine, whenLabel } from './useAuditLabels'
import { formatMoney } from './useMoney'

describe('actionLabel', () => {
  it('names a known action', () => {
    expect(actionLabel('payment.refund').label).toBe('Hizo un reembolso')
  })
  it('shows the raw action when it has no label, so nothing is hidden', () => {
    expect(actionLabel('brand.new')).toEqual({ label: 'brand.new', icon: 'mdi-circle-small', tone: 'secondary' })
  })
  it('gives every label an icon and a tone', () => {
    for (const [action, entry] of Object.entries(ACTION_LABELS)) {
      expect(entry.label, action).toBeTruthy()
      expect(entry.icon, action).toMatch(/^mdi-/)
      expect(entry.tone, action).toBeTruthy()
    }
  })
  it('has a filter family for the prefix of every labelled action', () => {
    const families = new Set(ACTION_FILTERS.map(f => f.value))
    for (const action of Object.keys(ACTION_LABELS)) expect(families.has(action.split('.')[0]), action).toBe(true)
  })
})

describe('fieldLine', () => {
  it('shows a dash for empty values', () => {
    for (const v of [null, undefined, '']) expect(fieldLine('name', v)).toEqual({ label: 'Nombre', text: '—' })
  })
  it('keeps zero and false (they are values)', () => {
    expect(fieldLine('max_uses', 0).text).toBe('0')
    expect(fieldLine('is_active', false).text).toBe('No')
  })
  it('formats cents as money', () => {
    expect(fieldLine('priceCents', 9900)).toEqual({ label: 'Precio', text: formatMoney(9900) })
    expect(fieldLine('amountCents', '7950').text).toBe('$79.50')
  })
  it('translates plan, status, role and coupon kind', () => {
    expect(fieldLine('plan', 'premium').text).toBe('Completo')
    expect(fieldLine('plan', 'other').text).toBe('other')
    expect(fieldLine('status', 'refunded').text).toBe('Reembolsado')
    expect(fieldLine('role', 'superadmin').text).toBe('Superadmin')
    expect(fieldLine('kind', 'percent_off').text).toBe('Porcentaje')
    expect(fieldLine('kind', 'fixed_price').text).toBe('Precio fijo')
    expect(fieldLine('kind', 'weird').text).toBe('weird')
  })
  it('words booleans in Spanish', () => {
    expect(fieldLine('is_founder', true).text).toBe('Sí')
  })
  it('uses the key when the field has no label', () => {
    expect(fieldLine('mystery', 5)).toEqual({ label: 'mystery', text: '5' })
  })
})

describe('whenLabel', () => {
  const iso = '2026-11-13T16:05:00Z'
  it('includes the year only in the long form', () => {
    expect(whenLabel(iso)).toContain('2026')
    expect(whenLabel(iso, true)).not.toContain('2026')
  })
})

describe('formatMoney', () => {
  it('drops cents when there are none', () => {
    expect(formatMoney(9900)).toBe('$99')
  })
  it('keeps two decimals otherwise', () => {
    expect(formatMoney(7950)).toBe('$79.50')
  })
  it('treats junk as zero', () => {
    expect(formatMoney(Number('abc'))).toBe('$0')
  })
})
