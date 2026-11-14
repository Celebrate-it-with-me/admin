import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EXPIRY_OPTIONS, expiryFor, expiryLabel, groupBySection, sectionLabel, toDateInput, type EventModuleRow, type ModuleOverride } from './logic'

const NOW = new Date('2026-11-13T12:00:00')

describe('toDateInput', () => {
  it('pads month and day', () => {
    expect(toDateInput(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toDateInput(new Date(2026, 10, 13))).toBe('2026-11-13')
  })
})

describe('expiryFor', () => {
  it('has no expiry for "none"', () => {
    expect(expiryFor('none', '', NOW)).toBeNull()
  })
  it('adds the number of days to now', () => {
    expect(expiryFor('7', '', NOW)).toBe(new Date(NOW.getTime() + 7 * 86_400_000).toISOString())
    expect(expiryFor('90', '', NOW)).toBe(new Date(NOW.getTime() + 90 * 86_400_000).toISOString())
  })
  it('is undefined for a date choice without a date', () => {
    expect(expiryFor('date', '', NOW)).toBeUndefined()
  })
  it('is undefined for an invalid or past date', () => {
    expect(expiryFor('date', 'not-a-date', NOW)).toBeUndefined()
    expect(expiryFor('date', '2026-11-12', NOW)).toBeUndefined()
  })
  it('ends a picked future date at the end of that day', () => {
    expect(expiryFor('date', '2026-11-20', NOW)).toBe(new Date('2026-11-20T23:59:59').toISOString())
  })
  it('accepts today while the day has not ended', () => {
    expect(expiryFor('date', '2026-11-13', NOW)).toBe(new Date('2026-11-13T23:59:59').toISOString())
  })
  it('offers every choice expiryFor understands', () => {
    expect(EXPIRY_OPTIONS.map(o => o.value)).toEqual(['none', '7', '30', '90', 'date'])
  })
})

describe('groupBySection', () => {
  const row = (key: string, section: string, order: number): EventModuleRow => ({
    key, section, order, baseState: 'active', effectiveState: 'active', source: 'plan', override: null,
  })
  it('orders sections like the menu and rows by order', () => {
    const groups = groupBySection([row('c', 'extras', 2), row('b', 'extras', 1), row('a', 'main', 1), row('x', 'other', 1)])
    expect(groups.map(g => g.section)).toEqual(['main', 'extras', 'other'])
    expect(groups[1].rows.map(r => r.key)).toEqual(['b', 'c'])
  })
  it('labels sections with a fallback', () => {
    expect(sectionLabel('guests')).toBe('Invitados')
    expect(sectionLabel('other')).toBe('other')
  })
})

describe('expiryLabel', () => {
  const override = (expiresAt: string | null): ModuleOverride => ({ state: 'active', reason: 'x', expiresAt, createdAt: null, createdBy: null })
  beforeEach(() => { vi.stubEnv('TZ', 'UTC') })
  afterEach(() => { vi.unstubAllEnvs() })

  it('is empty without an exception', () => {
    expect(expiryLabel(null)).toBe('')
  })
  it('says there is no expiry', () => {
    expect(expiryLabel(override(null))).toBe('Sin vencimiento')
  })
  it('words the date', () => {
    const text = expiryLabel(override('2026-11-20T12:00:00Z'))
    expect(text).toMatch(/^Vence el /)
    expect(text).toContain('2026')
  })
})
