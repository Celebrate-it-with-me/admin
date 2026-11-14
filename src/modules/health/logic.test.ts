import { describe, expect, it } from 'vitest'
import { PROBE_COLOR, PROBE_ICON, PROBE_TEXT, SCHEDULER_PROBE, SCHEDULER_TEXT, agoFromDate, agoFromSeconds, dateTime, plural, shortClass } from './logic'

describe('agoFromSeconds', () => {
  it.each([
    [0, 'hace menos de 1 min'],
    [59, 'hace menos de 1 min'],
    [60, 'hace 1 min'],
    [3599, 'hace 59 min'],
    [3600, 'hace 1 h'],
    [86399, 'hace 23 h'],
    [86400, 'hace 1 d'],
    [3 * 86400 + 5, 'hace 3 d'],
  ])('%i s -> %s', (seconds, text) => {
    expect(agoFromSeconds(seconds)).toBe(text)
  })
})

describe('agoFromDate', () => {
  const now = Date.parse('2026-11-13T12:00:00Z')
  it('shows a dash without a date', () => {
    expect(agoFromDate(null, now)).toBe('—')
  })
  it('measures from now', () => {
    expect(agoFromDate('2026-11-13T11:55:00Z', now)).toBe('hace 5 min')
  })
  it('never goes negative for a date in the future', () => {
    expect(agoFromDate('2026-11-13T13:00:00Z', now)).toBe('hace menos de 1 min')
  })
})

describe('dateTime', () => {
  it('shows a dash without a date', () => {
    expect(dateTime(null)).toBe('—')
  })
  it('formats a date', () => {
    expect(dateTime('2026-11-13T12:00:00Z')).toContain('2026')
  })
})

describe('shortClass', () => {
  it('keeps the last namespace segment', () => {
    expect(shortClass('App\\Jobs\\SendInvite')).toBe('SendInvite')
    expect(shortClass('SendInvite')).toBe('SendInvite')
  })
  it('names an unknown class', () => {
    expect(shortClass(null)).toBe('Desconocido')
    expect(shortClass('')).toBe('Desconocido')
  })
})

describe('plural', () => {
  it('uses the singular only for one', () => {
    expect(plural(1, 'trabajo', 'trabajos')).toBe('1 trabajo')
    expect(plural(0, 'trabajo', 'trabajos')).toBe('0 trabajos')
    expect(plural(2, 'trabajo', 'trabajos')).toBe('2 trabajos')
  })
})

describe('probe tables', () => {
  it('cover the same three states', () => {
    const states = ['ok', 'error', 'unknown']
    for (const table of [PROBE_TEXT, PROBE_ICON, PROBE_COLOR]) expect(Object.keys(table).sort()).toEqual([...states].sort())
  })
  it('maps every scheduler state to a probe state with a text', () => {
    for (const key of Object.keys(SCHEDULER_TEXT) as (keyof typeof SCHEDULER_TEXT)[]) {
      expect(SCHEDULER_PROBE[key]).toBeDefined()
      expect(PROBE_TEXT[SCHEDULER_PROBE[key]]).toBeDefined()
    }
  })
})
