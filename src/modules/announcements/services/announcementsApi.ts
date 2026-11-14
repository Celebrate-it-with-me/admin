import { API } from '@/services/axios'
import * as mock from './mock'
import type { Announcement, AnnouncementBody, AnnouncementList, AudienceQuery, ListParams } from '../types'

/**
 * Client of admin/announcements (contract: docs/plans/announcements-contract.md). While the API is not in place,
 * VITE_ANNOUNCEMENTS_MOCK=true switches every call to an in-memory simulation (./mock.ts) with the contract's shapes and
 * errors. Writes need a recent re-authentication: the axios interceptor opens the dialog and repeats the request, so
 * nothing here deals with it. Bodies and query are snake_case; answers come in camelCase.
 */
export const useMock = import.meta.env.VITE_ANNOUNCEMENTS_MOCK === 'true'

export async function listAnnouncements(params: ListParams = {}): Promise<AnnouncementList> {
  if (useMock) return mock.listAnnouncements(params)
  const query: Record<string, string | number> = {}
  if (params.status) query.status = params.status
  if (params.page) query.page = params.page
  if (params.perPage) query.per_page = params.perPage
  const body = (await API.get('announcements', { params: query })).data
  return { items: body.data, meta: body.meta }
}

export async function createAnnouncement(body: AnnouncementBody, reason: string): Promise<Announcement> {
  if (useMock) return mock.createAnnouncement(body, reason)
  return (await API.post('announcements', { ...body, reason })).data.data
}

export async function updateAnnouncement(id: number, body: AnnouncementBody, reason: string): Promise<Announcement> {
  if (useMock) return mock.updateAnnouncement(id, body, reason)
  return (await API.put(`announcements/${id}`, { ...body, reason })).data.data
}

export async function deleteAnnouncement(id: number, reason: string): Promise<void> {
  if (useMock) return mock.deleteAnnouncement(id, reason)
  await API.delete(`announcements/${id}`, { data: { reason } })
}

/** How many organizers would see an announcement with this audience today. */
export async function previewAudience(query: AudienceQuery): Promise<number> {
  if (useMock) return mock.previewAudience(query)
  return (await API.post('announcements/audience-preview', query)).data.data.count
}
