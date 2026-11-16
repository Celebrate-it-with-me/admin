import { API } from '@/services/axios'
import type { StaffRole } from '@/types'
import type { AcceptBody, AcceptResult, InvitationPreview, InviteBody, InviteResult, Member } from '../types'
import { readAcceptResult } from '../logic'

/**
 * Client of admin/team and of the public admin/invitations (contract: docs/plans/admin-team-contract.md). While the API
 * is not in place, VITE_TEAM_MOCK=true switches every call to an in-memory simulation (./mock.ts) with the contract's
 * shapes and error responses. Writes need a recent re-authentication: the axios interceptor opens the dialog and repeats
 * the request, so nothing here deals with it.
 */
export const useMock = import.meta.env.DEV && import.meta.env.VITE_TEAM_MOCK === 'true'

/** Dynamic so the production bundle (where useMock is statically false) does not contain the mock. */
const loadMock = () => import('./mock')

export async function listTeam(): Promise<Member[]> {
  if (useMock) return (await loadMock()).listTeam()
  return (await API.get('team')).data.data
}

/** `mailSent` is a root field next to `data`; a missing one counts as sent. */
const withMail = (body: { data: Member; mailSent?: boolean }): InviteResult => ({ member: body.data, mailSent: body.mailSent !== false })

export async function inviteMember(body: InviteBody): Promise<InviteResult> {
  if (useMock) return (await loadMock()).inviteMember(body)
  return withMail((await API.post('team', body)).data)
}

export async function resendInvitation(id: number, reason?: string): Promise<InviteResult> {
  if (useMock) return (await loadMock()).resendInvitation(id, reason)
  return withMail((await API.post(`team/${id}/invitation/resend`, reason ? { reason } : {})).data)
}

export async function revokeInvitation(id: number, reason: string): Promise<void> {
  if (useMock) return (await loadMock()).revokeInvitation(id, reason)
  await API.delete(`team/${id}/invitation`, { data: { reason } })
}

export async function suspendMember(id: number, reason: string): Promise<Member> {
  if (useMock) return (await loadMock()).suspendMember(id, reason)
  return (await API.post(`team/${id}/suspend`, { reason })).data.data
}

export async function reactivateMember(id: number, reason: string): Promise<Member> {
  if (useMock) return (await loadMock()).reactivateMember(id, reason)
  return (await API.post(`team/${id}/reactivate`, { reason })).data.data
}

export async function changeRole(id: number, role: StaffRole, reason: string): Promise<Member> {
  if (useMock) return (await loadMock()).changeRole(id, role, reason)
  return (await API.patch(`team/${id}`, { role, reason })).data.data
}

export async function removeMember(id: number, reason: string): Promise<void> {
  if (useMock) return (await loadMock()).removeMember(id, reason)
  await API.delete(`team/${id}`, { data: { reason } })
}

/** Resolves with how many sessions were closed. */
export async function resetTwoFactor(id: number, reason: string): Promise<number> {
  if (useMock) return (await loadMock()).resetTwoFactor(id, reason)
  return (await API.post(`team/${id}/two-factor/reset`, { reason })).data.data.sessionsClosed
}

// ── public (no session) ──

export async function getInvitation(token: string): Promise<InvitationPreview> {
  if (useMock) return (await loadMock()).getInvitation(token)
  return (await API.get(`invitations/${encodeURIComponent(token)}`)).data.data
}

export async function acceptInvitation(token: string, body: AcceptBody): Promise<AcceptResult> {
  if (useMock) return (await loadMock()).acceptInvitation(token, body)
  const result = readAcceptResult((await API.post(`invitations/${encodeURIComponent(token)}/accept`, body)).data)
  if (!result) throw new Error('unexpected accept response')
  return result
}
