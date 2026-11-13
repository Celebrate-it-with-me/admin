import type { PlanOption, PlanWarning } from './types'

/** Pure helpers of the Plan and payment tab. */

export const PLAN_OPTIONS: PlanOption[] = [
  { slug: 'basic', name: 'Basic', limit: 30 },
  { slug: 'premium', name: 'Premium', limit: 300 },
  { slug: 'lux', name: 'Lux', limit: null },
]

/** "79", "79.50" or "79,50" to cents; null when it is not a valid non-negative amount. */
export function dollarsToCents(input: string): number | null {
  const text = input.trim().replace(/^\$/, '').replace(',', '.')
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return null
  return Math.round(parseFloat(text) * 100)
}

/** Guests loaded against the plan limit: a percentage (capped at 100) and whether it is over. */
export function usage(guests: number, limit: number | null): { percent: number; over: boolean; unlimited: boolean } {
  if (limit == null || limit <= 0) return { percent: 0, over: false, unlimited: true }
  return { percent: Math.min(100, Math.round((guests / limit) * 100)), over: guests > limit, unlimited: false }
}

export const GATEWAY_LABEL: Record<string, string> = { manual: 'Pago a mano', fake: 'Pasarela de prueba', stripe: 'Tarjeta (Stripe)' }
export const gatewayLabel = (g: string | null) => (g ? (GATEWAY_LABEL[g] ?? g) : '—')

const ERROR_TEXT: Record<string, string> = {
  not_paid: 'Solo se puede reembolsar una compra pagada.',
  event_published: 'No se puede reembolsar: la invitación ya está publicada. El reembolso total solo aplica antes de publicar.',
  same_plan: 'El evento ya tiene ese plan.',
}
export const REFUND_BLOCKED: Record<string, string> = {
  not_paid: 'Solo se reembolsa una compra pagada.',
  event_published: 'No se puede reembolsar porque la invitación ya está publicada.',
}

/** Turns a failed request into a sentence for the team. */
export function explainError(e: unknown): string {
  const data = (e as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } })?.response
  if (data?.status === 403) return 'Solo un superadmin puede hacer esto.'
  const first = Object.entries(data?.data?.errors ?? {})[0]
  if (!first) return 'No pudimos hacerlo. Inténtalo de nuevo.'
  if (first[0] === 'reason') return 'Escribe un motivo de al menos 5 caracteres.'
  if (first[0] === 'amountCents') return 'El importe no es válido.'
  return ERROR_TEXT[first[1][0]] ?? first[1][0]
}

/** What a plan change did, in words. */
export function warningText(w: PlanWarning): string {
  switch (w.code) {
    case 'guests_over_limit':
      return `Hay ${w.guests} invitados y el nuevo plan permite ${w.limit}. No se borró a nadie, pero ${w.published ? 'no se podrán agregar más invitados' : 'no se podrá publicar'} hasta bajar la lista o subir el plan.`
    case 'modules_locked':
      return `Se bloquearon funciones del plan anterior (${w.modules.length}).`
    case 'paid_purchase_exists':
      return 'El evento tiene una compra pagada: sigue registrada. Para devolver el dinero usa "Reembolsar".'
    default:
      return ''
  }
}
