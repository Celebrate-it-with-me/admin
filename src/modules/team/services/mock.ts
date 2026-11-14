/* eslint-disable @typescript-eslint/no-unused-vars -- the mock keeps the real signatures */
import { useCurrentUserStore } from '@/store/currentUser'
import type { StaffRole } from '@/types'
import type { AcceptBody, AcceptResult, InvitationPreview, InviteBody, InviteResult, Member } from '../types'
import { readAcceptResult } from '../logic'

/**
 * In-memory stand-in for the team API, used only with VITE_TEAM_MOCK=true (dev and screenshots). It answers with the
 * shapes and the error responses of docs/plans/admin-team-contract.md: 422 `{message, errors: {<field>: [<code>]}}`
 * and 403/404/409/410 `{message, code}`.
 *
 * Invitation tokens to try on /accept-invite: `valid` (new account, 2FA required), `noname` (asks for a name),
 * `existing` (an account that already exists: asks for the current password, which is `password`), `twofa` (answers a
 * two-factor challenge instead of a session), `expired` (410);
 * any other token is 404.
 */

const wait = (ms = 220) => new Promise(r => setTimeout(r, ms))
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const failValidation = (field: string, code: string): never => {
  throw { response: { status: 422, data: { message: 'The given data was invalid.', errors: { [field]: [code] } } } }
}
const failCode = (status: number, code: string, message = code): never => {
  throw { response: { status, data: { message, code } } }
}

const DAY = 86_400_000
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()
const ahead = (ms: number) => new Date(Date.now() + ms).toISOString()

const member = (id: number, name: string, email: string, role: StaffRole, status: Member['status'], lastLoginAt: string | null, twoFactorEnabled: boolean, invitation: Member['invitation'] = null): Member =>
  ({ id, name, email, role, status, lastLoginAt, twoFactorEnabled, invitation })

/** Invitation ids are opaque, in a range of their own (the server adds 1_000_000_000): only used as a key. */
const INVITED = 1_000_000_000
let nextId = INVITED + 100
const members: Member[] = [
  member(1, 'Admin Quinvite', 'admin@cwm.test', 'superadmin', 'active', ago(5 * 60_000), true),
  member(2, 'Ana Soporte', 'ana@cwm.test', 'support', 'active', ago(3 * DAY), true),
  member(3, 'Berta Díaz', 'berta@cwm.test', 'support', 'active', ago(75 * DAY), false),
  member(INVITED + 4, 'Carlos Ruiz', 'carlos.ruiz@cwm.test', 'support', 'invited', null, false, { sentAt: ago(1 * DAY), expiresAt: ahead(2 * DAY), resendCount: 0, expired: false }),
  member(INVITED + 5, 'Diana Pérez', 'diana@cwm.test', 'superadmin', 'invited', null, false, { sentAt: ago(5 * DAY), expiresAt: ago(2 * DAY), resendCount: 2, expired: true }),
  member(6, 'Elena Gómez', 'elena@cwm.test', 'support', 'suspended', ago(20 * DAY), true),
]
/** Accounts that already exist in Quinvite (an organizer can be invited without a name). */
const knownAccounts = new Set(['marisol@cwm.test', 'lucia@cwm.test'])

const ORDER = { active: 0, invited: 1, suspended: 2 }
const sorted = () => [...members].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name, 'es'))
const find = (id: number): Member => members.find(m => m.id === id) ?? failCode(404, 'member_not_found', 'Not found.')
/** Only resend and revoke exist on an invitation; everything else answers 404 member_not_found. */
const findUser = (id: number): Member => { const m = find(id); return m.status === 'invited' ? failCode(404, 'member_not_found', 'Not found.') : m }
const findInvited = (id: number): Member => { const m = members.find(x => x.id === id); return m && m.status === 'invited' ? m : failCode(404, 'invitation_invalid', 'Not found.') }
const meEmail = async (): Promise<string> => (useCurrentUserStore().user.email ?? 'admin@cwm.test').toLowerCase()
const activeSuperadmins = () => members.filter(m => m.role === 'superadmin' && m.status === 'active').length
const guard = async (m: Member) => {
  if (m.email.toLowerCase() === await meEmail()) failValidation('user', 'cannot_change_self')
  if (m.role === 'superadmin' && m.status === 'active' && activeSuperadmins() === 1) failValidation('user', 'last_superadmin')
}

export async function listTeam(): Promise<Member[]> {
  await wait()
  return clone(sorted())
}

/** An address with `smtpfail` in it simulates the mail failing: the invitation exists but `mailSent` is false. */
const mailSentTo = (email: string) => !email.toLowerCase().includes('smtpfail')

export async function inviteMember(body: InviteBody): Promise<InviteResult> {
  await wait()
  const email = body.email.trim().toLowerCase()
  const existing = members.find(m => m.email.toLowerCase() === email)
  if (existing?.status === 'invited') failValidation('email', 'invitation_pending')
  if (existing) failValidation('email', 'already_staff')
  if (!body.name?.trim() && !knownAccounts.has(email)) failValidation('name', 'name_required')
  const created = member(nextId++, body.name?.trim() || 'Marisol Vega', email, body.role, 'invited', null, false, { sentAt: new Date().toISOString(), expiresAt: ahead(3 * DAY), resendCount: 0, expired: false })
  members.push(created)
  return { member: clone(created), mailSent: mailSentTo(email) }
}

export async function resendInvitation(id: number, _reason?: string): Promise<InviteResult> {
  await wait()
  const m = findInvited(id)
  if (m.invitation!.resendCount >= 5) failValidation('user', 'resend_limit')
  m.invitation = { sentAt: new Date().toISOString(), expiresAt: ahead(3 * DAY), resendCount: m.invitation!.resendCount + 1, expired: false }
  return { member: clone(m), mailSent: mailSentTo(m.email) }
}

export async function revokeInvitation(id: number, _reason: string): Promise<void> {
  await wait()
  const m = findInvited(id)
  members.splice(members.indexOf(m), 1)
}

export async function suspendMember(id: number, _reason: string): Promise<Member> {
  await wait()
  const m = findUser(id)
  await guard(m)
  m.status = 'suspended'
  return clone(m)
}

export async function reactivateMember(id: number, _reason: string): Promise<Member> {
  await wait()
  const m = findUser(id)
  m.status = 'active'
  return clone(m)
}

export async function changeRole(id: number, role: StaffRole, _reason: string): Promise<Member> {
  await wait()
  const m = findUser(id)
  if (m.role !== role) await guard(m)
  m.role = role
  return clone(m)
}

export async function removeMember(id: number, _reason: string): Promise<void> {
  await wait()
  const m = findUser(id)
  await guard(m)
  members.splice(members.indexOf(m), 1)
}

export async function resetTwoFactor(id: number, _reason: string): Promise<number> {
  await wait()
  const m = findUser(id)
  if (!m.twoFactorEnabled) failCode(409, 'two_factor_not_enabled')
  m.twoFactorEnabled = false
  return 2
}

// ── public ──

const previews: Record<string, InvitationPreview> = {
  valid: { name: 'Carlos Ruiz', email: 'carlos.ruiz@cwm.test', role: 'support', expiresAt: ahead(2 * DAY), accountExists: false, requiresTwoFactor: true },
  noname: { name: '', email: 'nuevo@cwm.test', role: 'superadmin', expiresAt: ahead(3 * DAY), accountExists: false, requiresTwoFactor: false },
  twofa: { name: 'Marisol Vega', email: 'marisol@cwm.test', role: 'support', expiresAt: ahead(1 * DAY), accountExists: true, requiresTwoFactor: true },
  existing: { name: 'Marisol Vega', email: 'marisol@cwm.test', role: 'support', expiresAt: ahead(1 * DAY), accountExists: true, requiresTwoFactor: true },
}

export async function getInvitation(token: string): Promise<InvitationPreview> {
  await wait(300)
  if (token === 'expired') failCode(410, 'invitation_expired', 'Invitation expired.')
  const preview = previews[token]
  if (!preview) failCode(404, 'invitation_invalid', 'Invitation not found.')
  return clone(preview)
}

export async function acceptInvitation(token: string, body: AcceptBody): Promise<AcceptResult> {
  await wait(400)
  // An account that already had admin two-factor: no `data`, a challenge for the login's second step.
  if (token === 'twofa') return readAcceptResult({ twoFactorRequired: true, challenge: 'mock-challenge' }) as AcceptResult
  if (token === 'expired') failCode(410, 'invitation_expired', 'Invitation expired.')
  const preview = previews[token]
  if (!preview) failCode(404, 'invitation_invalid', 'Invitation not found.')
  let name = preview.name
  if ('current_password' in body) {
    // An existing account: only its current password, which does not change.
    if (!preview.accountExists || body.current_password !== 'password') failValidation('current_password', 'invalid_current_password')
  } else {
    if (preview.accountExists) failValidation('current_password', 'invalid_current_password')
    if (!name && !body.name?.trim()) failValidation('name', 'The name field is required.')
    if (body.password.length < 12) failValidation('password', 'La contraseña debe tener al menos 12 caracteres.')
    if (body.password !== body.password_confirmation) failValidation('password', 'Las contraseñas no coinciden.')
    name = name || body.name!.trim()
  }
  // A real session token when there is one (the screenshots sign in first), so the redirect lands on a working panel.
  const session = localStorage.getItem('token') ?? 'mock-token'
  return readAcceptResult({ data: { token: session, twoFactorSetupRequired: preview.requiresTwoFactor, user: { id: 9, name, email: preview.email, roles: [preview.role] } } }) as AcceptResult
}
