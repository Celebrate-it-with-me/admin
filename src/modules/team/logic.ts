/** Pure helpers of Equipo y roles: statuses, relative dates, row actions, filters and error messages. */
import { MIN_PASSWORD, passwordScore } from '@/modules/account/logic'
import type { StaffRole } from '@/types'
import type { AcceptResult, InviteLoadState, Member, MemberAction, MemberStatus, StatusView, TeamFilters } from './types'

export { MIN_PASSWORD, passwordScore }

export const STATUS_LABELS: Record<MemberStatus, string> = { active: 'Activo', invited: 'Invitado', suspended: 'Suspendido' }

export const ROLE_OPTIONS: { value: StaffRole; title: string; subtitle: string }[] = [
  { value: 'support', title: 'Soporte', subtitle: 'Mira eventos y usuarios, modera contenido, regala funciones y suplanta cuentas para ayudar.' },
  { value: 'superadmin', title: 'Superadmin', subtitle: 'Todo lo de soporte, más planes, pagos, precios, plantillas y el equipo.' },
]

const HOUR = 3_600_000
const DAY = 24 * HOUR
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** "vence en 2 días", "vence en 5 horas", or "Vencida" once the date has passed. */
export function expiryLabel(expiresAt: string | null | undefined, now = Date.now()): string {
  const time = expiresAt ? new Date(expiresAt).getTime() : NaN
  if (Number.isNaN(time) || time <= now) return 'Vencida'
  const left = time - now
  if (left < HOUR) return 'vence en menos de una hora'
  if (left < DAY) return `vence en ${plural(Math.floor(left / HOUR), 'hora', 'horas')}`
  return `vence en ${plural(Math.max(1, Math.round(left / DAY)), 'día', 'días')}`
}

const DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** "hace 3 días"; null means she never signed in. */
export function lastLoginLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Nunca ha entrado'
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return 'Nunca ha entrado'
  const diff = Math.max(0, now - time)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(diff / HOUR)
  if (hours < 24) return `hace ${plural(hours, 'hora', 'horas')}`
  const days = Math.floor(diff / DAY)
  if (days < 30) return `hace ${plural(days, 'día', 'días')}`
  if (days < 365) return `hace ${plural(Math.floor(days / 30), 'mes', 'meses')}`
  return DATE.format(new Date(time))
}

/** The chip of a member and the line under it. An invitation is expired by its flag or by its date. */
export function statusView(member: Pick<Member, 'status' | 'invitation'>, now = Date.now()): StatusView {
  if (member.status === 'suspended') return { label: STATUS_LABELS.suspended, color: 'error', icon: 'mdi-pause-circle-outline', note: '', noteTone: 'muted' }
  if (member.status === 'invited') {
    const inv = member.invitation
    const label = inv && !inv.expired ? expiryLabel(inv.expiresAt, now) : 'Vencida'
    const expired = label === 'Vencida'
    return { label: STATUS_LABELS.invited, color: expired ? 'warning' : 'info', icon: 'mdi-email-fast-outline', note: label, noteTone: expired ? 'error' : 'muted' }
  }
  return { label: STATUS_LABELS.active, color: 'success', icon: 'mdi-check-circle-outline', note: '', noteTone: 'muted' }
}

export const isSelf = (member: Pick<Member, 'id' | 'email'>, me: { id?: number; email?: string }): boolean =>
  (me.id !== undefined && member.id === me.id) || (!!me.email && member.email.toLowerCase() === me.email.toLowerCase())

/** Whether this member is the only active superadmin (the API refuses to remove, suspend or demote her). */
export const isLastSuperadmin = (member: Member, members: Member[]): boolean =>
  member.role === 'superadmin' && member.status === 'active' && members.filter(m => m.role === 'superadmin' && m.status === 'active').length === 1

const SELF = 'No puedes hacerlo sobre tu propia cuenta.'
const LAST = 'Es la única persona superadmin activa.'

/** What the row menu offers, per status. Disabled entries carry the reason. */
export function actionsFor(member: Member, members: Member[], me: { id?: number; email?: string }): MemberAction[] {
  const self = isSelf(member, me)
  const last = isLastSuperadmin(member, members)
  const guard = (hint?: string) => (self ? { disabled: true, hint: SELF } : hint ? { disabled: true, hint } : {})

  if (member.status === 'invited') {
    const count = member.invitation?.resendCount ?? 0
    return [
      { key: 'resend', label: 'Reenviar invitación', icon: 'mdi-email-sync-outline', hint: count > 0 ? `Ya la reenviaste ${plural(count, 'vez', 'veces')}.` : undefined },
      { key: 'revoke', label: 'Revocar invitación', icon: 'mdi-email-remove-outline', danger: true },
    ]
  }
  if (member.status === 'suspended') {
    return [
      { key: 'reactivate', label: 'Reactivar', icon: 'mdi-play-circle-outline', ...guard() },
      { key: 'remove', label: 'Quitar del equipo', icon: 'mdi-account-cancel-outline', danger: true, ...guard() },
    ]
  }
  const actions: MemberAction[] = [
    { key: 'role', label: 'Cambiar rol', icon: 'mdi-swap-horizontal', ...guard(last ? LAST : undefined) },
    { key: 'suspend', label: 'Suspender', icon: 'mdi-pause-circle-outline', ...guard(last ? LAST : undefined) },
  ]
  if (member.twoFactorEnabled) actions.push({ key: 'twofactor', label: 'Reiniciar dos pasos', icon: 'mdi-shield-refresh-outline', ...guard() })
  actions.push({ key: 'remove', label: 'Quitar del equipo', icon: 'mdi-account-cancel-outline', danger: true, ...guard(last ? LAST : undefined) })
  return actions
}

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function filterMembers(members: Member[], filters: TeamFilters): Member[] {
  const q = normalize(filters.search.trim())
  return members.filter(m =>
    (!filters.status || m.status === filters.status)
    && (!filters.role || m.role === filters.role)
    && (!q || normalize(m.name).includes(q) || normalize(m.email).includes(q)))
}

export const hasFilters = (f: TeamFilters): boolean => !!(f.search.trim() || f.status || f.role)

export function countByStatus(members: Member[]): Record<MemberStatus, number> {
  const counts: Record<MemberStatus, number> = { active: 0, invited: 0, suspended: 0 }
  for (const m of members) counts[m.status]++
  return counts
}

export const emailLooksValid = (value: string): boolean => /^\S+@\S+\.\S+$/.test(value.trim())

// ── errors ──

/** Spanish message for every code of the contract (the API sends `code` or `errors.<field>[0]`). */
export const ERROR_MESSAGES: Record<string, string> = {
  already_staff: 'Esa persona ya está en el equipo.',
  invitation_pending: 'Ya hay una invitación pendiente para ese correo. Puedes reenviarla desde la lista.',
  name_required: 'Esa cuenta no existe todavía: escribe un nombre para crearla.',
  last_superadmin: 'Es la única persona superadmin activa: no se puede quitar, suspender ni cambiar de rol.',
  cannot_change_self: 'No puedes hacerlo sobre tu propia cuenta.',
  resend_limit: 'Ya reenviaste esta invitación el máximo de veces. Revócala y crea una nueva.',
  member_not_found: 'Esta persona ya no está en la lista.',
  invitation_invalid: 'Esa invitación ya no existe: se usó, se revocó o la reemplazó otra más nueva.',
  invitation_expired: 'Esta invitación venció.',
  account_suspended: 'Esta cuenta está suspendida.',
  invalid_current_password: 'La contraseña actual no es correcta.',
  two_factor_not_enabled: 'Esa persona no tiene la verificación en dos pasos activa.',
  two_factor_required_to_reset: 'Para reiniciar los dos pasos de otra persona superadmin, activa primero los tuyos en Mi cuenta.',
  reauth_required: 'Confirma tu identidad para continuar.',
  reason: 'Escribe un motivo de al menos 5 caracteres.',
}

interface ApiError {
  reauthCancelled?: boolean
  response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, string[]> } }
}

export interface TeamError {
  /** The contract code, when there is one. */
  code: string | null
  /** The field it belongs to (for 422s), to show it under the input. */
  field: string | null
  message: string
}

/** Turns whatever failed into a message in Spanish; unknown 422 texts (already in Spanish) pass through. */
export function parseTeamError(e: unknown, fallback = 'No pudimos hacerlo. Inténtalo de nuevo.'): TeamError {
  const err = e as ApiError
  if (err?.reauthCancelled) return { code: null, field: null, message: 'No se hizo ningún cambio: cancelaste la confirmación de identidad.' }
  const res = err?.response
  if (!res) return { code: null, field: null, message: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' }
  const code = res.data?.code
  if (code && ERROR_MESSAGES[code]) return { code, field: null, message: ERROR_MESSAGES[code] }
  for (const [field, list] of Object.entries(res.data?.errors ?? {})) {
    const first = list?.[0]
    if (!first) continue
    return { code: ERROR_MESSAGES[first] ? first : null, field, message: ERROR_MESSAGES[first] ?? first }
  }
  if (res.status === 429) return { code: null, field: null, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
  if (res.status === 403) return { code: code ?? null, field: null, message: 'No tienes permiso para hacer esto.' }
  if (res.status === 404) return { code: code ?? null, field: null, message: ERROR_MESSAGES.member_not_found }
  return { code: code ?? null, field: null, message: fallback }
}

// ── accept-invite page ──

/** Which screen the invitation link leads to when loading it fails. */
export function inviteLoadFailure(e: unknown): Exclude<InviteLoadState, 'loading' | 'ready'> {
  const res = (e as ApiError)?.response
  if (!res) return 'network'
  const code = res.data?.code
  if (res.status === 410 || code === 'invitation_expired') return 'expired'
  if (res.status === 404 || code === 'invitation_invalid') return 'invalid'
  return 'error'
}

export interface NewPasswordCheck {
  longEnough: boolean
  matches: boolean
  ok: boolean
}

export function checkNewPassword(password: string, confirmation: string): NewPasswordCheck {
  const longEnough = password.length >= MIN_PASSWORD
  const matches = password.length > 0 && password === confirmation
  return { longEnough, matches, ok: longEnough && matches }
}

/** The accept answer (contract): `{data: {token, twoFactorSetupRequired, user}}`, or `{twoFactorRequired, challenge}` without `data`. */
export function readAcceptResult(body: unknown): AcceptResult | null {
  const o = (body && typeof body === 'object' ? body : {}) as { data?: { token?: unknown; twoFactorSetupRequired?: unknown }; twoFactorRequired?: unknown; challenge?: unknown }
  if (o.data && typeof o.data.token === 'string' && o.data.token) return { kind: 'session', token: o.data.token, twoFactorSetupRequired: o.data.twoFactorSetupRequired === true }
  if (o.twoFactorRequired === true && typeof o.challenge === 'string' && o.challenge) return { kind: 'challenge', challenge: o.challenge }
  return null
}

/** Field errors of a 422 (`errors.<field>[0]`), with the contract's codes turned into Spanish. */
export function fieldErrors(e: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [field, list] of Object.entries((e as ApiError)?.response?.data?.errors ?? {})) {
    const first = list?.[0]
    if (first) out[field] = ERROR_MESSAGES[first] ?? first
  }
  return out
}
