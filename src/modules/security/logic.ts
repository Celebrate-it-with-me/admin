import type { SecurityState } from './types'

/** "2 de 5 personas ya tienen la verificación en dos pasos" (the verb follows the first number). */
export function coverageText(enrolled: number, total: number): string {
  return `${enrolled} de ${total} ${total === 1 ? 'persona' : 'personas'} ya ${enrolled === 1 ? 'tiene' : 'tienen'} la verificación en dos pasos`
}

/** 0 to 100 for the bar; an empty team counts as nobody covered. */
export function coveragePercent(enrolled: number, total: number): number {
  return total > 0 ? Math.round((enrolled / total) * 100) : 0
}

/** People who still have no two-factor. */
export const pendingCount = (s: Pick<SecurityState, 'enrolled' | 'total'>): number => Math.max(0, s.total - s.enrolled)

/** How many of the pending people the capped list does not show. */
export const hiddenCount = (s: Pick<SecurityState, 'enrolled' | 'total' | 'notEnrolled'>): number => Math.max(0, pendingCount(s) - s.notEnrolled.length)

/** What turning it on will do, for the confirmation dialog. */
export function activationWarning(pending: number): string {
  const tail = 'Quien no la tenga solo podrá entrar a Mi cuenta hasta configurarla.'
  if (pending === 0) return `Todas las personas del equipo ya la tienen, así que nadie se quedará fuera. ${tail}`
  const who = pending === 1 ? 'Hay 1 persona sin ella' : `Hay ${pending} personas sin ella`
  return `${who}. ${tail}`
}

interface ApiErrorShape {
  reauthCancelled?: boolean
  response?: { status?: number; data?: { code?: string; message?: string; errors?: Record<string, string[]> } }
}

const CODES: Record<string, string> = {
  own_two_factor_required: 'Antes de exigirla a todo el equipo, activa tu propia verificación en dos pasos en Mi cuenta. Si no, te quedarías fuera del panel.',
  reauth_required: 'Confirma tu identidad para hacer este cambio.',
  two_factor_required: 'Para usar el panel necesitas activar tu verificación en dos pasos en Mi cuenta.',
}

/** Spanish text for what went wrong when changing the switch. */
export function switchError(e: unknown, fallback = 'No pudimos cambiar el ajuste. Inténtalo de nuevo.'): string {
  const err = e as ApiErrorShape
  if (err?.reauthCancelled) return 'No se hizo ningún cambio: cancelaste la confirmación de identidad.'
  const data = err?.response?.data
  if (data?.code && CODES[data.code]) return CODES[data.code]
  if (data?.errors?.reason) return 'Escribe un motivo de al menos 5 caracteres.'
  if (data?.errors?.enabled) return 'Valor no válido para el ajuste.'
  if (err?.response?.status === 403) return 'No tienes permiso para cambiar este ajuste.'
  return fallback
}
