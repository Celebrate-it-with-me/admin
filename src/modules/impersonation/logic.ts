/** Pure helpers of the "enter as this user" flow (kept free of Vue so they are easy to check). */

export const SESSION_MINUTES = 45

const MESSAGES: Record<string, string> = {
  impersonation_self: 'No puedes entrar como tu propia cuenta.',
  impersonation_staff: 'No se puede entrar como una cuenta del equipo.',
  impersonation_suspended: 'La cuenta está suspendida: reactívala antes de entrar como ella.',
  impersonation_anonymized: 'La cuenta fue borrada (anonimizada): no hay nada que ver.',
  impersonation_chained: 'Ya estás dentro de una sesión de soporte: termínala antes de abrir otra.',
  impersonation_notify_forbidden: 'Solo un superadmin puede entrar sin avisar a la usuaria.',
}

interface ErrorLike { response?: { status?: number; data?: { code?: string; message?: string; errors?: Record<string, string[]> } } }

/** Spanish text for what the server answered when starting a session. */
export function explainImpersonationError(e: unknown): string {
  const res = (e as ErrorLike)?.response
  const code = res?.data?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (res?.status === 403) return 'No tienes permiso para entrar como una usuaria.'
  if (res?.status === 404) return 'Esa cuenta ya no existe.'
  if (res?.status === 422) {
    const first = Object.values(res.data?.errors ?? {})[0]?.[0]
    if (first) return first
  }
  return 'No pudimos abrir la sesión de soporte. Inténtalo de nuevo.'
}

/** Staff, suspended and anonymized accounts cannot be entered (the server refuses them as well). */
export function canEnterAs(u: { staffRoles?: string[]; suspended?: boolean; anonymizedAt?: string | null }): boolean {
  return !u.staffRoles?.length && !u.suspended && !u.anonymizedAt
}

/**
 * Where the app receives the session. The token travels in the URL fragment: it never reaches a server or its logs.
 * `appBase` is VITE_BASE_URL (with or without the trailing slash).
 */
export function buildImpersonationUrl(appBase: string, token: string, expiresAt: string): string {
  const base = appBase.endsWith('/') ? appBase : appBase + '/'
  const fragment = new URLSearchParams({ token, expires: expiresAt }).toString()
  return `${base}impersonate#${fragment}`
}
