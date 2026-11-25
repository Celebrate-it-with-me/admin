import { safeExternalUrl } from '@/modules/templates/packages/logic'
import type { Coupon, LaunchOffer, LaunchOfferChanges, LaunchOfferResult, PurchaseFilters, PurchaseStatus, Gateway, PurchaseDetail } from './types'

/** $99, $79.50: whole dollars without decimals. */
export function money(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-US', {
    style: 'currency', currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2,
  }).format(cents / 100)
}

export const emptyFilters = (): PurchaseFilters => ({
  search: '', status: null, gateway: null, founder: null, disputed: false, needsReview: false, coupon: '', paidFrom: '', paidTo: '', createdFrom: '', createdTo: '',
})

/** Query string of the list: only what is filled in. */
export function buildParams(f: PurchaseFilters, page: number, perPage: number) {
  return {
    page,
    perPage,
    search: f.search.trim() || undefined,
    status: f.status || undefined,
    gateway: f.gateway || undefined,
    founder: f.founder === 'yes' ? 1 : f.founder === 'no' ? 0 : undefined,
    disputed: f.disputed ? 1 : undefined,
    needsReview: f.needsReview ? 1 : undefined,
    coupon: f.coupon.trim() || undefined,
    paidFrom: f.paidFrom || undefined,
    paidTo: f.paidTo || undefined,
    createdFrom: f.createdFrom || undefined,
    createdTo: f.createdTo || undefined,
  }
}

/** Filters in use besides the search box and the two main selects (they live in the "Más filtros" panel). */
export const extraFilterCount = (f: PurchaseFilters): number =>
  [f.founder, f.disputed, f.needsReview, f.coupon.trim(), f.paidFrom, f.paidTo, f.createdFrom, f.createdTo].filter(Boolean).length

export const hasAnyFilter = (f: PurchaseFilters): boolean =>
  Boolean(f.search.trim() || f.status || f.gateway) || extraFilterCount(f) > 0

export const STATUS: Record<PurchaseStatus, { label: string; color: string; icon: string }> = {
  paid: { label: 'Pagada', color: 'success', icon: 'mdi-check-circle-outline' },
  pending: { label: 'Pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  refunded: { label: 'Reembolsada', color: 'secondary', icon: 'mdi-undo-variant' },
  failed: { label: 'Fallida', color: 'error', icon: 'mdi-alert-circle-outline' },
  chargeback: { label: 'Contracargo', color: 'error', icon: 'mdi-shield-alert-outline' },
}

/** Dispute states of Stripe in words for the team; an unknown one is shown as sent. */
export const DISPUTE_STATUS: Record<string, { label: string; color: string }> = {
  warning_needs_response: { label: 'Alerta temprana: falta responder', color: 'warning' },
  warning_under_review: { label: 'Alerta temprana en revisión', color: 'warning' },
  warning_closed: { label: 'Alerta temprana cerrada', color: 'secondary' },
  needs_response: { label: 'Disputa: falta responder', color: 'error' },
  under_review: { label: 'Disputa en revisión del banco', color: 'warning' },
  charge_refunded: { label: 'Disputa cerrada por reembolso', color: 'secondary' },
  won: { label: 'Disputa ganada', color: 'success' },
  lost: { label: 'Disputa perdida', color: 'error' },
}

export const disputeLabel = (status: string | null): { label: string; color: string } | null =>
  status ? (DISPUTE_STATUS[status] ?? { label: `Disputa: ${status}`, color: 'warning' }) : null

/** A dispute still open: the money is held and the answer to the bank is due in Stripe. */
export const disputeIsOpen = (status: string | null): boolean =>
  Boolean(status) && !['won', 'lost', 'charge_refunded', 'warning_closed'].includes(status as string)

/** Reconcile is for Stripe purchases only (a manual or simulated one has nothing to compare with). */
export const canSync = (p: Pick<PurchaseDetail, 'gateway'>): boolean => p.gateway === 'stripe'

export const GATEWAY: Record<Gateway, string> = { stripe: 'Stripe', manual: 'Manual (Zelle)', fake: 'Simulada (pruebas)' }

export const EVENT_STATUS: Record<string, string> = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado' }

export const dateLabel = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const dateTimeLabel = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

/** Dollars typed by a person ("99", "$79.50", "79,50") to cents; null when it is not a valid amount. */
export function dollarsToCents(input: string, max = 10000): number | null {
  const text = input.trim().replace(/^\$/, '').replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null
  const dollars = Number(text)
  return dollars > max ? null : Math.round(dollars * 100)
}

export const centsToInput = (cents: number): string => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)

/** What each code of the payments API means, in words for the team. The server's own message is the fallback. */
export const CODE_HELP: Record<string, string> = {
  not_paid: 'No se puede reembolsar: esta compra no está pagada (o ya fue reembolsada).',
  event_published: 'No se puede reembolsar: el evento ya está publicado. El reembolso total solo es posible mientras la invitación no se haya publicado.',
  gateway_error: 'Stripe no respondió o rechazó la operación. No se hizo ningún cambio: la compra sigue como estaba. Espera un momento e inténtalo de nuevo; si persiste, revisa el pago en Stripe y usa «Conciliar».',
  not_stripe: 'Esta compra no es de Stripe: no hay nada que conciliar.',
  not_needs_review: 'Esta compra ya no estaba marcada para revisión.',
  reauth_required: 'Hace falta confirmar tu contraseña para esta acción.',
}

export const codeHelp = (code: string | undefined | null): string | null => (code ? (CODE_HELP[code] ?? null) : null)

type ApiError = { reauthCancelled?: boolean; response?: { status?: number; data?: { code?: string; message?: string; errors?: Record<string, string[]> } } }

/**
 * What the payments API answers when an action fails: 502/`gateway_error` (Stripe), a 422 `errors.purchase[0]` code,
 * a 403/404/409 `{code}`, or the validation message; otherwise the fallback.
 */
export function actionError(e: unknown, fallback: string): string {
  const err = e as ApiError
  if (err?.reauthCancelled) return 'No se confirmó tu contraseña, así que no se hizo ningún cambio.'
  const data = err?.response?.data
  if (err?.response?.status === 502 || data?.code === 'gateway_error') return CODE_HELP.gateway_error
  const byCode = codeHelp(data?.errors?.purchase?.[0]) ?? codeHelp(data?.code)
  return byCode ?? firstError(e, fallback)
}

/** What the server answers when a refund is not possible, in words for the team. */
export function refundError(codes: string[] | undefined, fallback: string): string {
  for (const code of ['event_published', 'not_paid', 'gateway_error']) if (codes?.includes(code)) return CODE_HELP[code]
  return fallback
}

/** Why a paid purchase cannot be refunded now, or null when it can. */
export function refundBlockReason(p: { status: PurchaseStatus; canRefund: boolean }): string | null {
  if (p.status !== 'paid') return null
  return p.canRefund ? null : CODE_HELP.event_published
}

export function couponValue(c: Pick<Coupon, 'kind' | 'value'>, currency = 'USD'): string {
  return c.kind === 'fixed_price' ? `${money(c.value, currency)} precio fijo` : `${c.value} % menos`
}

export type CouponState = { label: string; color: string }

export function couponState(c: Coupon, now = new Date()): CouponState {
  if (!c.is_active) return { label: 'Inactivo', color: 'secondary' }
  if (c.expires_at && new Date(c.expires_at) <= now) return { label: 'Vencido', color: 'warning' }
  if (c.max_uses !== null && c.times_used >= c.max_uses) return { label: 'Agotado', color: 'warning' }
  return { label: 'Activo', color: 'success' }
}

export const usesLabel = (c: Pick<Coupon, 'times_used' | 'max_uses'>): string =>
  c.max_uses === null ? `${c.times_used} (sin tope)` : `${c.times_used} de ${c.max_uses}`

/** First validation message of a Laravel 422, or the fallback. */
export function firstError(e: unknown, fallback: string): string {
  const errors = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data
  const first = errors?.errors ? Object.values(errors.errors)[0]?.[0] : undefined
  return first ?? errors?.message ?? fallback
}

export function validationCodes(e: unknown, field: string): string[] | undefined {
  return (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors?.[field]
}

/** The gateway link from the API, or null when it is not a plain public https URL (never rendered as a link then). */
export const safeStripeUrl = (raw: unknown): string | null => safeExternalUrl(raw)

// ---- Launch offer ($79, first slots) ----

export type OfferState = { key: 'active' | 'soldout' | 'inactive'; label: string; color: string; icon: string }

/** Active = open now; soldout = switched on but no slots left; anything else (switched off, or not open for another reason) = inactive. */
export function offerState(o: Pick<LaunchOffer, 'isActive' | 'active' | 'slotsLeft'>): OfferState {
  if (!o.isActive) return { key: 'inactive', label: 'Inactiva', color: 'secondary', icon: 'mdi-pause-circle-outline' }
  if (o.active) return { key: 'active', label: 'Activa', color: 'success', icon: 'mdi-check-circle-outline' }
  if (o.slotsLeft <= 0) return { key: 'soldout', label: 'Agotada', color: 'warning', icon: 'mdi-alert-circle-outline' }
  return { key: 'inactive', label: 'Inactiva', color: 'secondary', icon: 'mdi-pause-circle-outline' }
}

export interface OfferForm { price: string; totalSlots: string; slotsUsed: string; allowBelowUsed: boolean }

export const offerForm = (o: LaunchOffer | null): OfferForm => ({
  price: o ? centsToInput(o.priceCents) : '',
  totalSlots: o ? String(o.totalSlots) : '',
  slotsUsed: o ? String(o.slotsUsed) : '',
  allowBelowUsed: false,
})

/** A whole number of slots (0 to 100000), or null. */
export function parseSlots(input: string): number | null {
  const t = input.trim()
  if (!/^\d{1,6}$/.test(t)) return null
  const n = Number(t)
  return n <= 100000 ? n : null
}

/** The cheapest an offer may be: half of the list price, and never under Stripe's 50 cents (same rule as the API). */
export const offerMinCents = (listPriceCents: number): number => Math.max(50, Math.ceil(listPriceCents / 2))

export type OfferErrors = { price: string; totalSlots: string; slotsUsed: string }

/** Client-side mirror of the API rules, so the obvious mistakes are told before the reauth. The server stays the judge. */
export function offerErrors(form: OfferForm, offer: LaunchOffer | null, listPriceCents: number, currency = 'USD'): OfferErrors {
  const out: OfferErrors = { price: '', totalSlots: '', slotsUsed: '' }
  const cents = dollarsToCents(form.price)
  const min = offerMinCents(listPriceCents)
  if (cents === null) out.price = 'Escribe un importe en dólares, por ejemplo 79.'
  else if (cents >= listPriceCents) out.price = `Debe ser menor que el precio normal (${money(listPriceCents, currency)}).`
  else if (cents < min) out.price = `No puede ser menor que ${money(min, currency)} (la mitad del precio normal).`
  const total = parseSlots(form.totalSlots)
  if (total === null) out.totalSlots = 'Un número entero de 0 a 100,000.'
  if (offer) {
    const used = parseSlots(form.slotsUsed)
    if (used === null) out.slotsUsed = 'Un número entero de 0 a 100,000.'
    else if (used < offer.slotsPaid) out.slotsUsed = `No puede ser menor que las compras pagadas (${offer.slotsPaid}).`
  }
  return out
}

export const offerHasErrors = (e: OfferErrors): boolean => Object.values(e).some(Boolean)

/** True when the total typed is under the slots used: the API needs `allowBelowUsed` said on purpose. */
export function totalBelowUsed(form: OfferForm, offer: LaunchOffer | null): boolean {
  const total = parseSlots(form.totalSlots)
  const used = offer ? parseSlots(form.slotsUsed) : 0
  return total !== null && used !== null && total < used
}

/** Only what changed (the first PUT, with no offer yet, sends price and total). Empty object when nothing changed. */
export function offerChanges(form: OfferForm, offer: LaunchOffer | null): LaunchOfferChanges {
  const out: LaunchOfferChanges = {}
  const cents = dollarsToCents(form.price)
  const total = parseSlots(form.totalSlots)
  if (cents !== null && cents !== offer?.priceCents) out.priceCents = cents
  if (total !== null && total !== offer?.totalSlots) out.totalSlots = total
  if (offer) {
    const used = parseSlots(form.slotsUsed)
    if (used !== null && used !== offer.slotsUsed) out.slotsUsed = used
  }
  if (Object.keys(out).length && form.allowBelowUsed) out.allowBelowUsed = true
  return out
}

/** What each code of the launch-offer endpoint means. */
export const OFFER_CODE_HELP: Record<string, string> = {
  required_to_create_offer: 'Para crear la oferta hace falta el precio y el tope de cupos.',
  below_paid_purchases: 'Los cupos usados no pueden ser menos que las compras ya pagadas.',
  below_used_slots: 'El tope no puede quedar por debajo de los cupos usados. Si es a propósito, marca la casilla de permitirlo.',
  launch_offer_conflict: 'Otra persona acaba de crear la oferta. Recarga y vuelve a intentarlo.',
}

/** Words for a failed launch-offer call: cancelled reauth, 403, 409, a 422 code, the validation message, or the fallback. */
export function offerError(e: unknown, fallback: string): string {
  const err = e as ApiError
  if (err?.reauthCancelled) return 'No se confirmó tu contraseña, así que no se hizo ningún cambio.'
  const status = err?.response?.status
  const data = err?.response?.data
  if (status === 403) return data?.code === 'reauth_required' ? CODE_HELP.reauth_required : 'No tienes permiso para gestionar la oferta de lanzamiento.'
  const code = Object.values(data?.errors ?? {})[0]?.[0] ?? data?.code
  if (code && OFFER_CODE_HELP[code]) return OFFER_CODE_HELP[code]
  return firstError(e, fallback)
}

/** The line shown after a save, including checkouts closed or left open when it was switched off or repriced. */
export function offerNotice(r: LaunchOfferResult, what: 'activate' | 'deactivate' | 'update' | 'create'): string {
  const head = { activate: 'Oferta activada.', deactivate: 'Oferta desactivada.', update: 'Oferta actualizada.', create: 'Oferta creada.' }[what]
  const parts = [head]
  if (r.sessionsClosed > 0) parts.push(`Se cerraron ${r.sessionsClosed} ${r.sessionsClosed === 1 ? 'pago en curso' : 'pagos en curso'}.`)
  if (r.sessionsStillOpen > 0) parts.push(`${r.sessionsStillOpen} ${r.sessionsStillOpen === 1 ? 'pago no se pudo cerrar y sigue abierto' : 'pagos no se pudieron cerrar y siguen abiertos'}: revísalos en Compras.`)
  return parts.join(' ')
}
