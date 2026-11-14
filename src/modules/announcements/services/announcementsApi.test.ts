import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('./mock', () => ({}))

import type { AnnouncementBody } from '../types'

const body: AnnouncementBody = {
  level: 'news', title_es: 'a', title_en: 'b', body_es: 'c', body_en: 'd', cta_label_es: null, cta_label_en: null, cta_url: null,
  dismissible: true, audience: 'all', upcoming_days: null, starts_at: '2027-03-10T14:00:00.000Z', ends_at: null, is_active: true,
}

// A developer's .env.local may switch the mock on; these tests are about the real client.
vi.stubEnv('VITE_ANNOUNCEMENTS_MOCK', 'false')
const { createAnnouncement, deleteAnnouncement, listAnnouncements, previewAudience, updateAnnouncement } = await import('./announcementsApi')

beforeEach(() => { Object.values(http).forEach(fn => fn.mockReset()) })

describe('announcementsApi', () => {
  it('lists with snake_case query and returns items and meta', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { page: 2, perPage: 10, total: 11 } } })
    const r = await listAnnouncements({ status: 'active', page: 2, perPage: 10 })
    expect(http.get).toHaveBeenCalledWith('announcements', { params: { status: 'active', page: 2, per_page: 10 } })
    expect(r).toEqual({ items: [{ id: 1 }], meta: { page: 2, perPage: 10, total: 11 } })
  })
  it('omits the status filter when there is none', async () => {
    http.get.mockResolvedValue({ data: { data: [], meta: { page: 1, perPage: 10, total: 0 } } })
    await listAnnouncements({ status: null, page: 1, perPage: 10 })
    expect(http.get.mock.calls[0][1]).toEqual({ params: { page: 1, per_page: 10 } })
  })
  it('creates with the body and the reason in snake_case', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 5 } } })
    expect(await createAnnouncement(body, 'Campaña de marzo')).toEqual({ id: 5 })
    expect(http.post).toHaveBeenCalledWith('announcements', { ...body, reason: 'Campaña de marzo' })
  })
  it('updates with PUT on the id', async () => {
    http.put.mockResolvedValue({ data: { data: { id: 5 } } })
    await updateAnnouncement(5, body, 'Corrijo el texto')
    expect(http.put).toHaveBeenCalledWith('announcements/5', { ...body, reason: 'Corrijo el texto' })
  })
  it('deletes sending the reason as the request body', async () => {
    http.delete.mockResolvedValue({ data: { data: null } })
    await deleteAnnouncement(5, 'Ya no aplica')
    expect(http.delete).toHaveBeenCalledWith('announcements/5', { data: { reason: 'Ya no aplica' } })
  })
  it('asks the audience preview and returns the count', async () => {
    http.post.mockResolvedValue({ data: { data: { count: 91 } } })
    expect(await previewAudience({ audience: 'upcoming_event', upcoming_days: 30 })).toBe(91)
    expect(http.post).toHaveBeenCalledWith('announcements/audience-preview', { audience: 'upcoming_event', upcoming_days: 30 })
  })
})
