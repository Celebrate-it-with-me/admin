import { describe, expect, it } from 'vitest'
import {
  audienceLabel, audienceQuery, emptyForm, fieldMessage, formFrom, fromLocalInput, isValidCtaUrl, parseDays, parseError, previewFor,
  serverFieldErrors, tabsWithErrors, toBody, toLocalInput, validate,
} from './logic'
import type { Announcement, AnnouncementForm } from './types'

const valid = (over: Partial<AnnouncementForm> = {}): AnnouncementForm => ({
  ...emptyForm(), titleEs: 'Hola', titleEn: 'Hello', bodyEs: 'Texto', bodyEn: 'Text', ...over,
})

describe('dates', () => {
  it('round-trips a local datetime through ISO UTC', () => {
    const iso = fromLocalInput('2027-03-10T09:30')!
    expect(iso).toMatch(/Z$/)
    expect(toLocalInput(iso)).toBe('2027-03-10T09:30')
  })
  it('gives empty/null for nothing or garbage', () => {
    expect(fromLocalInput('')).toBeNull()
    expect(fromLocalInput('nope')).toBeNull()
    expect(toLocalInput(null)).toBe('')
    expect(toLocalInput('nope')).toBe('')
  })
})

describe('isValidCtaUrl', () => {
  it.each(['https://quinvite.com/x', '/dashboard/guests', '/'])('accepts %s', url => expect(isValidCtaUrl(url)).toBe(true))
  it.each(['http://quinvite.com', 'javascript:alert(1)', '//evil.com', 'quinvite.com', 'https://', 'https:// espacio.com', 'ftp://x.com'])('rejects %s', url => expect(isValidCtaUrl(url)).toBe(false))
})

describe('parseDays / audienceQuery', () => {
  it('accepts whole days 1 to 365 only', () => {
    expect(parseDays('30')).toBe(30)
    expect(parseDays('365')).toBe(365)
    for (const bad of ['0', '366', '1.5', '-3', '', 'abc']) expect(parseDays(bad)).toBeNull()
  })
  it('builds the preview query, with days only for upcoming_event', () => {
    expect(audienceQuery('all', '30')).toEqual({ audience: 'all' })
    expect(audienceQuery('upcoming_event', '45')).toEqual({ audience: 'upcoming_event', upcoming_days: 45 })
    expect(audienceQuery('upcoming_event', '')).toBeNull()
  })
})

describe('toBody', () => {
  it('uses snake_case, trims, and sends null for empty optional fields', () => {
    const body = toBody(valid({ titleEs: '  Hola  ', startsAt: '2027-03-10T09:00', endsAt: '' }))
    expect(body).toMatchObject({
      level: 'info', title_es: 'Hola', title_en: 'Hello', body_es: 'Texto', body_en: 'Text', cta_label_es: null, cta_label_en: null, cta_url: null,
      dismissible: true, audience: 'all', upcoming_days: null, ends_at: null, is_active: true,
    })
    expect(body.starts_at).toBe(fromLocalInput('2027-03-10T09:00'))
    expect(Object.keys(body).every(k => k === k.toLowerCase())).toBe(true)
  })
  it('sends the days only with the upcoming_event audience', () => {
    expect(toBody(valid({ audience: 'upcoming_event', upcomingDays: '14' })).upcoming_days).toBe(14)
    expect(toBody(valid({ audience: 'free', upcomingDays: '14' })).upcoming_days).toBeNull()
  })
})

describe('formFrom', () => {
  it('turns an announcement into the form and back into the same body', () => {
    const a: Announcement = {
      id: 3, level: 'news', titleEs: 'T', titleEn: 'T', bodyEs: 'B', bodyEn: 'B', ctaLabelEs: 'Ver', ctaLabelEn: 'See', ctaUrl: '/x', dismissible: false,
      audience: 'upcoming_event', upcomingDays: 20, startsAt: '2027-03-10T14:00:00.000Z', endsAt: null, isActive: false, status: 'inactive', dismissedCount: 0, createdAt: '', updatedAt: '',
    }
    const body = toBody(formFrom(a))
    expect(body).toMatchObject({ level: 'news', cta_label_es: 'Ver', cta_url: '/x', dismissible: false, audience: 'upcoming_event', upcoming_days: 20, ends_at: null, is_active: false })
    expect(body.starts_at).toBe('2027-03-10T14:00:00.000Z')
  })
})

describe('validate', () => {
  it('passes a complete form', () => expect(validate(valid())).toEqual({}))
  it('requires title and body in both languages', () => {
    expect(validate(valid({ titleEs: ' ', bodyEn: '' }))).toEqual({ title_es: 'required', body_en: 'required' })
  })
  it('enforces the character limits', () => {
    const e = validate(valid({ titleEs: 'x'.repeat(81), bodyEn: 'x'.repeat(401), ctaLabelEs: 'x'.repeat(31) }))
    expect(e).toMatchObject({ title_es: 'too_long', body_en: 'too_long', cta_label_es: 'too_long' })
    expect(validate(valid({ titleEs: 'x'.repeat(80), bodyEs: 'x'.repeat(400) }))).toEqual({})
  })
  it('checks the URL and asks for both labels when there is one', () => {
    expect(validate(valid({ ctaUrl: 'http://x.com' })).cta_url).toBe('invalid_url')
    expect(validate(valid({ ctaUrl: '/ok', ctaLabelEs: 'Ver' }))).toEqual({ cta_label_en: 'cta_label_required' })
    expect(validate(valid({ ctaUrl: '/ok' }))).toMatchObject({ cta_label_es: 'cta_label_required', cta_label_en: 'cta_label_required' })
    expect(validate(valid({ ctaUrl: '/ok', ctaLabelEs: 'Ver', ctaLabelEn: 'See' }))).toEqual({})
  })
  it('asks for the days with upcoming_event', () => {
    expect(validate(valid({ audience: 'upcoming_event', upcomingDays: '' })).upcoming_days).toBe('upcoming_days_required')
    expect(validate(valid({ audience: 'upcoming_event', upcomingDays: '400' })).upcoming_days).toBe('invalid_days')
    expect(validate(valid({ audience: 'free', upcomingDays: '' }))).toEqual({})
  })
  it('requires a start and an end after it', () => {
    expect(validate(valid({ startsAt: '' })).starts_at).toBe('required')
    expect(validate(valid({ startsAt: '2027-03-10T10:00', endsAt: '2027-03-10T09:00' })).ends_at).toBe('ends_before_start')
    expect(validate(valid({ startsAt: '2027-03-10T10:00', endsAt: '2027-03-10T10:00' })).ends_at).toBe('ends_before_start')
    expect(validate(valid({ startsAt: '2027-03-10T10:00', endsAt: '2027-03-11T10:00' }))).toEqual({})
  })
  it('marks which language tab has a problem', () => {
    expect(tabsWithErrors({ title_es: 'required' })).toEqual({ es: true, en: false })
    expect(tabsWithErrors({ cta_label_en: 'too_long', starts_at: 'required' })).toEqual({ es: false, en: true })
    expect(tabsWithErrors({ cta_url: 'invalid_url' })).toEqual({ es: false, en: false })
  })
})

describe('errors', () => {
  const res = (status: number, data: object) => ({ response: { status, data } })
  it('reads the first code of every field of a 422', () => {
    expect(serverFieldErrors(res(422, { errors: { title_es: ['required', 'x'], ends_at: ['ends_before_start'] } }))).toEqual({ title_es: 'required', ends_at: 'ends_before_start' })
  })
  it('knows a message for each contract code', () => {
    for (const code of ['required', 'too_long', 'invalid_level', 'invalid_audience', 'invalid_url', 'ends_before_start', 'cta_label_required', 'upcoming_days_required']) {
      expect(fieldMessage('title_es', code)).not.toBe(code)
    }
    expect(fieldMessage('title_es', 'too_long')).toContain('80')
    expect(fieldMessage('body_en', 'too_long')).toContain('400')
    expect(fieldMessage('cta_label_es', 'too_long')).toContain('30')
  })
  it('parses 404, reauth, network and 422', () => {
    expect(parseError(res(404, { code: 'announcement_not_found' })).code).toBe('announcement_not_found')
    expect(parseError({ reauthCancelled: true, response: { status: 403, data: { code: 'reauth_required' } } }).message).toContain('cancelaste')
    expect(parseError(new Error('x')).message).toContain('conexión')
    expect(parseError(res(422, { errors: { audience: ['invalid_audience'] } }))).toMatchObject({ field: 'audience', code: 'invalid_audience' })
    expect(parseError(res(500, {})).message).toContain('No pudimos')
  })
})

describe('previewFor', () => {
  it('picks the language and shows the button only with URL and label', () => {
    const f = valid({ titleEs: 'Hola', titleEn: 'Hello', ctaUrl: '/x', ctaLabelEs: 'Ver', ctaLabelEn: '' })
    expect(previewFor(f, 'es')).toMatchObject({ title: 'Hola', ctaLabel: 'Ver', ctaUrl: '/x' })
    expect(previewFor(f, 'en')).toMatchObject({ title: 'Hello', ctaLabel: null, ctaUrl: null })
  })
  it('keeps HTML as plain text', () => {
    expect(previewFor(valid({ bodyEs: '<b>hola</b>' }), 'es').body).toBe('<b>hola</b>')
  })
})

describe('labels', () => {
  it('describes the audience', () => {
    expect(audienceLabel('free', null)).toBe('Plan gratis')
    expect(audienceLabel('upcoming_event', 1)).toContain('1 día')
    expect(audienceLabel('upcoming_event', 30)).toContain('30 días')
  })
})
