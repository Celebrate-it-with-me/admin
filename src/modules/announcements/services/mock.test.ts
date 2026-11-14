import { beforeEach, describe, expect, it, vi } from 'vitest'

const reauth = vi.hoisted(() => ({ askReauth: vi.fn() }))
vi.mock('@/services/reauth', () => reauth)

import { createAnnouncement, deleteAnnouncement, listAnnouncements, previewAudience, updateAnnouncement } from './mock'
import type { AnnouncementBody } from '../types'

const good: AnnouncementBody = {
  level: 'info', title_es: 'Hola', title_en: 'Hello', body_es: 'Texto', body_en: 'Text', cta_label_es: null, cta_label_en: null, cta_url: null,
  dismissible: true, audience: 'all', upcoming_days: null, starts_at: new Date(Date.now() - 1000).toISOString(), ends_at: null, is_active: true,
}
const errorsOf = async (promise: Promise<unknown>) => ((await promise.catch(e => e)) as { response?: { data?: { errors?: unknown } } }).response?.data?.errors

beforeEach(() => { reauth.askReauth.mockReset(); reauth.askReauth.mockResolvedValue(undefined) })

describe('announcements mock', () => {
  it('lists newest first, filtered and paginated, with meta', async () => {
    const first = await listAnnouncements({ page: 1, perPage: 5 })
    expect(first.items).toHaveLength(5)
    expect(first.meta).toMatchObject({ page: 1, perPage: 5 })
    expect(first.meta.total).toBeGreaterThan(5)
    const dates = first.items.map(a => a.createdAt)
    expect([...dates].sort().reverse()).toEqual(dates)
    const active = await listAnnouncements({ status: 'active', perPage: 50 })
    expect(active.items.length).toBeGreaterThan(0)
    expect(active.items.every(a => a.status === 'active')).toBe(true)
    for (const s of ['scheduled', 'ended', 'inactive'] as const) expect((await listAnnouncements({ status: s, perPage: 50 })).items.length).toBeGreaterThan(0)
  })

  it('creates (201 shape), asking to re-authenticate on the first write', async () => {
    const a = await createAnnouncement(good, 'Campaña de marzo')
    expect(a).toMatchObject({ titleEs: 'Hola', status: 'active', dismissedCount: 0 })
    expect(reauth.askReauth).toHaveBeenCalled()
  })

  it('answers reauth_required as cancelled when she cancels the dialog', async () => {
    // Move past the 5 minute window of the previous test.
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 10 * 60_000)
    reauth.askReauth.mockRejectedValue(undefined)
    const p = createAnnouncement(good, 'Campaña de marzo').catch(e => e)
    await vi.advanceTimersByTimeAsync(500)
    const e = await p
    vi.useRealTimers()
    expect(e.reauthCancelled).toBe(true)
    expect(e.response).toMatchObject({ status: 403, data: { code: 'reauth_required' } })
  })

  it('answers each 422 code of the contract', async () => {
    const bad = (over: Partial<AnnouncementBody>) => errorsOf(createAnnouncement({ ...good, ...over }, 'Un motivo'))
    expect(await bad({ title_es: '' })).toEqual({ title_es: ['required'] })
    expect(await bad({ body_en: 'x'.repeat(401) })).toEqual({ body_en: ['too_long'] })
    expect(await bad({ level: 'x' as never })).toEqual({ level: ['invalid_level'] })
    expect(await bad({ audience: 'x' as never })).toEqual({ audience: ['invalid_audience'] })
    expect(await bad({ cta_url: 'http://x.com' })).toEqual({ cta_url: ['invalid_url'] })
    expect(await bad({ cta_url: '/x', cta_label_es: 'Ver' })).toEqual({ cta_label_es: ['cta_label_required'] })
    expect(await bad({ audience: 'upcoming_event', upcoming_days: null })).toEqual({ upcoming_days: ['upcoming_days_required'] })
    expect(await bad({ ends_at: new Date(Date.parse(good.starts_at) - 1000).toISOString() })).toEqual({ ends_at: ['ends_before_start'] })
  })

  it('updates, and 404s on an unknown id for update and delete', async () => {
    const a = await createAnnouncement(good, 'Campaña de marzo')
    const u = await updateAnnouncement(a.id, { ...good, title_es: 'Nuevo' }, 'Corrijo el texto')
    expect(u.titleEs).toBe('Nuevo')
    const upd = await updateAnnouncement(99999, good, 'Corrijo el texto').catch(e => e)
    expect(upd.response).toMatchObject({ status: 404, data: { code: 'announcement_not_found' } })
    const del = await deleteAnnouncement(99999, 'Ya no aplica').catch(e => e)
    expect(del.response).toMatchObject({ status: 404, data: { code: 'announcement_not_found' } })
    await deleteAnnouncement(a.id, 'Ya no aplica')
    expect((await listAnnouncements({ perPage: 100 })).items.some(x => x.id === a.id)).toBe(false)
  })

  it('previews the audience and rejects an unknown one', async () => {
    expect(await previewAudience({ audience: 'all' })).toBeGreaterThan(await previewAudience({ audience: 'paid' }))
    expect(await previewAudience({ audience: 'upcoming_event', upcoming_days: 30 })).toBeGreaterThan(0)
    expect(await errorsOf(previewAudience({ audience: 'x' as never }))).toEqual({ audience: ['invalid_audience'] })
  })
})
