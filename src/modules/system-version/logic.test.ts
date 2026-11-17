import { describe, expect, it } from 'vitest'
import { buildDate, envColor, envLabel, normalizeApi, normalizeStatic, shortCommit, versionLabel } from './logic'

describe('normalize', () => {
  it('reads the API contract', () => {
    const info = normalizeApi({ version: '0.0.1', commit: 'abc1234', builtAt: '2026-11-17T10:00:00Z', environment: 'production', php: '8.4.1', laravel: '13.0.0' })
    expect(info).toMatchObject({ version: '0.0.1', environment: 'production', php: '8.4.1', laravel: '13.0.0' })
  })
  it('reads the static contract without environment', () => {
    expect(normalizeStatic({ name: 'cwm_app', version: '1.2.3', commit: 'abc1234', builtAt: '2026-11-17T10:00:00Z' })).toMatchObject({ version: '1.2.3', environment: null, php: null })
  })
  it('turns empty or missing fields into null (unknown version)', () => {
    expect(normalizeApi({ version: '', environment: 'local' })).toMatchObject({ version: null, commit: null, builtAt: null })
  })
  it('rejects a body that is not an object', () => {
    expect(() => normalizeStatic('<html></html>')).toThrow()
    expect(() => normalizeApi(null)).toThrow()
  })
})

describe('labels', () => {
  it('prefixes versions and handles unknown', () => {
    expect(versionLabel('0.0.1')).toBe('v0.0.1')
    expect(versionLabel('v1.0.0')).toBe('v1.0.0')
    expect(versionLabel(null)).toBe('Desconocida')
  })
  it('shortens the commit', () => {
    expect(shortCommit('abcdef1234567')).toBe('abcdef1')
    expect(shortCommit(null)).toBe('Desconocido')
    expect(shortCommit('unknown')).toBe('Desconocido')
  })
  it('formats dates and survives garbage', () => {
    expect(buildDate('2026-11-17T10:00:00Z')).toContain('2026')
    expect(buildDate('nope')).toBe('Desconocida')
    expect(buildDate(null)).toBe('Desconocida')
  })
  it('colors the environment', () => {
    expect(envLabel('production')).toBe('Producción')
    expect(envColor('production')).toBe('success')
    expect(envColor('staging')).toBe('warning')
    expect(envColor('local')).toBe('info')
    expect(envLabel(null)).toBe('Desconocido')
  })
})
