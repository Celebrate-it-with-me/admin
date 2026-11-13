/** Pure helpers of Mi cuenta: password rules, field errors from the API, and the words used for the history. */
import type { ActivityEntry } from './types'

export const MIN_PASSWORD = 12

export interface PasswordCheck {
  longEnough: boolean
  differentFromCurrent: boolean
  matches: boolean
  ok: boolean
}

/** The same rules the API enforces (it checks again): 12+ characters, not the current one, repeated correctly. */
export function checkPassword(current: string, next: string, confirmation: string): PasswordCheck {
  const longEnough = next.length >= MIN_PASSWORD
  const differentFromCurrent = next.length > 0 && next !== current
  const matches = next.length > 0 && next === confirmation
  return { longEnough, differentFromCurrent, matches, ok: longEnough && differentFromCurrent && matches && current.length > 0 }
}

/** 0 to 4, only to colour the bar: length is what the rule asks for, variety is a nudge. */
export function passwordScore(value: string): number {
  if (!value) return 0
  let score = 0
  if (value.length >= MIN_PASSWORD) score++
  if (value.length >= 16) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++
  return Math.min(score, 4)
}

export const SCORE_LABELS = ['', 'Débil', 'Aceptable', 'Buena', 'Fuerte']

interface ApiErrorShape {
  response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, string[]> } }
}

export interface ParsedError {
  status: number | undefined
  code: string | undefined
  /** First message per field, as the API wrote it (in Spanish). */
  fields: Record<string, string>
  message: string
}

export function parseApiError(e: unknown, fallback = 'No pudimos completar la acción. Inténtalo de nuevo.'): ParsedError {
  const r = (e as ApiErrorShape)?.response
  const fields: Record<string, string> = {}
  for (const [k, v] of Object.entries(r?.data?.errors ?? {})) fields[k] = v[0] ?? ''
  const first = Object.values(fields)[0]
  let message = first || fallback
  if (r?.status === 429) message = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
  return { status: r?.status, code: r?.data?.code, fields, message }
}

/** The codes as a text file: what the person copies or downloads. */
export function recoveryCodesText(codes: string[], email?: string): string {
  const head = ['Códigos de recuperación de Quinvite (panel de administración)']
  if (email) head.push(`Cuenta: ${email}`)
  head.push('Cada código sirve una sola vez. Guárdalos en un lugar seguro.', '')
  return [...head, ...codes].join('\n') + '\n'
}

export const ACCOUNT_ACTIONS: Record<string, { label: string; icon: string; tone: string }> = {
  'auth.login': { label: 'Inicio de sesión', icon: 'mdi-login', tone: 'info' },
  'auth.login_failed': { label: 'Intento fallido de inicio de sesión', icon: 'mdi-alert-outline', tone: 'warning' },
  'account.profile_updated': { label: 'Actualizaste tu perfil', icon: 'mdi-account-edit-outline', tone: 'primary' },
  'account.email_change_requested': { label: 'Pediste cambiar tu correo', icon: 'mdi-email-edit-outline', tone: 'primary' },
  'account.email_change_cancelled': { label: 'Cancelaste el cambio de correo', icon: 'mdi-email-remove-outline', tone: 'info' },
  'account.email_changed': { label: 'Cambiaste tu correo', icon: 'mdi-email-check-outline', tone: 'warning' },
  'account.password_changed': { label: 'Cambiaste tu contraseña', icon: 'mdi-lock-reset', tone: 'warning' },
  'account.two_factor_setup_started': { label: 'Empezaste a activar los dos pasos', icon: 'mdi-shield-key-outline', tone: 'info' },
  'account.two_factor_enabled': { label: 'Activaste la verificación en dos pasos', icon: 'mdi-shield-check-outline', tone: 'success' },
  'account.two_factor_disabled': { label: 'Desactivaste la verificación en dos pasos', icon: 'mdi-shield-off-outline', tone: 'warning' },
  'account.two_factor_failed': { label: 'Código de dos pasos incorrecto', icon: 'mdi-shield-alert-outline', tone: 'warning' },
  'account.two_factor_reset_cli': { label: 'El equipo técnico reinició tus dos pasos', icon: 'mdi-shield-refresh-outline', tone: 'warning' },
  'account.recovery_codes_regenerated': { label: 'Generaste códigos de recuperación nuevos', icon: 'mdi-key-chain-variant', tone: 'primary' },
  'account.recovery_code_used': { label: 'Usaste un código de recuperación', icon: 'mdi-key-variant', tone: 'warning' },
  'account.session_revoked': { label: 'Cerraste una sesión', icon: 'mdi-logout-variant', tone: 'info' },
  'account.sessions_revoked': { label: 'Cerraste las demás sesiones', icon: 'mdi-logout-variant', tone: 'info' },
  'account.logout': { label: 'Cerraste sesión', icon: 'mdi-logout', tone: 'info' },
  'account.logout_all': { label: 'Cerraste sesión en todos lados', icon: 'mdi-logout', tone: 'warning' },
}

export function describeActivity(entry: ActivityEntry): { label: string; icon: string; tone: string; note: string } {
  const base = ACCOUNT_ACTIONS[entry.action] ?? { label: entry.action, icon: 'mdi-history', tone: 'info' }
  const d = entry.detail ?? {}
  let note = ''
  if (entry.action === 'auth.login') {
    note = d.method === 'recovery_code' ? 'con un código de recuperación' : d.method === 'two_factor' ? 'con verificación en dos pasos' : ''
  } else if (entry.action === 'account.password_changed' && Number(d.sessionsClosed) > 0) {
    note = `Cerró ${d.sessionsClosed} ${Number(d.sessionsClosed) === 1 ? 'sesión' : 'sesiones'}`
  } else if (entry.action === 'account.recovery_code_used' && d.remaining !== undefined) {
    note = `Te quedan ${d.remaining}`
  } else if (entry.action === 'account.session_revoked' && d.device) {
    note = String(d.device)
  } else if (['account.sessions_revoked', 'account.logout_all'].includes(entry.action) && d.count !== undefined) {
    note = `${d.count} ${Number(d.count) === 1 ? 'sesión' : 'sesiones'}`
  }
  return { ...base, note }
}

const DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Nunca'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : DATE.format(date)
}

/** "hace 5 min" for a recent moment, the full date otherwise. */
export function sinceLabel(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'Sin actividad'
  const diff = Math.max(0, now - new Date(iso).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  return formatDateTime(iso)
}
