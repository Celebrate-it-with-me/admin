import { API } from '@/services/axios'
import type { LifecycleAction } from './logic'

export interface Meta { page: number; perPage: number; total: number; lastPage: number }
export interface Paged<T> { data: T[]; meta: Meta & Record<string, unknown> }

export interface Invite { id: number; email: string; role: string; status: string; sentAt: string | null; expiresAt: string | null; resendCount: number }
export interface UserHit { id: number; name: string; email: string; suspended: boolean }

export interface CommentItem { id: number; type: 'comment'; text: string; author: { type: string; name: string } | null; status: 'visible' | 'hidden'; createdAt: string }
export interface ImageItem { id: number; type: 'image'; title: string | null; thumbnailUrl: string | null; imageUrl: string | null; status: 'visible' | 'hidden'; createdAt: string }
export interface PadrinoItem { id: number; name: string; relationship: string | null; status: string; phone: string | null; email: string | null }
export interface GuestItem { id: number; name: string; isCompanion: boolean; rsvpStatus: string | null; phone: string | null; email: string | null }

export interface ActivityItem { id: number; type: string; createdAt: string; actor: { type: string; name: string } | null; byStaff: boolean; payload: Record<string, unknown> }
export interface StaffItem { id: number; action: string; createdAt: string; actor: { id: number; name: string } | null; reason: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null; impersonated: boolean }

const base = (id: number) => `events/${id}`

export const runLifecycle = async (id: number, action: LifecycleAction, reason: string) =>
  (await API.post(`${base(id)}/${action}`, { reason })).data.data as { id: number; status: string; stage: string }
export const resendOwnerEmail = async (id: number, reason: string) =>
  (await API.post(`${base(id)}/resend-owner-email`, { reason })).data.data as { sent: 'confirm_account' | 'welcome' }
export const fetchInvites = async (id: number) => (await API.get(`${base(id)}/collaborator-invites`)).data.data as Invite[]
export const resendInvite = async (id: number, invite: number, reason: string) =>
  (await API.post(`${base(id)}/resend-collaborator-invite/${invite}`, { reason })).data.data
export const changeSlug = async (id: number, slug: string, reason: string) =>
  (await API.put(`${base(id)}/slug`, { slug, reason })).data.data as { slug: string; previousSlug: string; warning: string }
export const transferOwner = async (id: number, newOwnerEmail: string, reason: string) =>
  (await API.post(`${base(id)}/transfer`, { newOwnerEmail, reason })).data.data as { newOwner: { id: number; name: string; email: string }; previousOwner: { id: number; name: string } | null }
export const findUserByEmail = async (email: string): Promise<UserHit | null> => {
  const rows = (await API.get('users', { params: { search: email, internal: 1, perPage: 5 } })).data.data as UserHit[]
  return rows.find(u => u.email.toLowerCase() === email.toLowerCase()) ?? null
}

export const fetchContent = async <T>(id: number, section: string, page: number): Promise<Paged<T>> =>
  (await API.get(`${base(id)}/content`, { params: { section, page, perPage: 15 } })).data

// Hide, restore and delete go through the moderation API (it audits and removes the files).
export const hideItem = async (type: 'comment' | 'image', id: number, reason: string) => (await API.post(`moderation/${type}/${id}/hide`, { reason })).data
export const restoreItem = async (type: 'comment' | 'image', id: number) => (await API.post(`moderation/${type}/${id}/restore`, {})).data
export const deleteItem = async (type: 'comment' | 'image', id: number, reason: string) => (await API.delete(`moderation/${type}/${id}`, { data: { reason } })).data

export const fetchLog = async <T>(id: number, source: 'activity' | 'staff', page: number): Promise<Paged<T> & { meta: { canViewStaff: boolean } }> =>
  (await API.get(`${base(id)}/log`, { params: { source, page, perPage: 20 } })).data
