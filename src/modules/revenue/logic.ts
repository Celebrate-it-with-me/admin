import type { Coupon, PurchaseFilters, PurchaseStatus, Gateway } from './types'

/** $99, $79.50: whole dollars without decimals. */
export function money(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-US', {
    style: 'currency', currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2,
  }).format(cents / 100)
}

export const emptyFilters = (): PurchaseFilters => ({
  search: '', status: null, gateway: null, founder: null, coupon: '', paidFrom: '', paidTo: '', createdFrom: '', createdTo: '',
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
    coupon: f.coupon.trim() || undefined,
    paidFrom: f.paidFrom || undefined,
    paidTo: f.paidTo || undefined,
    createdFrom: f.createdFrom || undefined,
    createdTo: f.createdTo || undefined,
  }
}

/** Filters in use besides the search box and the two main selects (they live in the "Más filtros" panel). */
export const extraFilterCount = (f: PurchaseFilters): number =>
  [f.founder, f.coupon.trim(), f.paidFrom, f.paidTo, f.createdFrom, f.createdTo].filter(Boolean).length

export const hasAnyFilter = (f: PurchaseFilters): boolean =>
  Boolean(f.search.trim() || f.status || f.gateway) || extraFilterCount(f) > 0

export const STATUS: Record<PurchaseStatus, { label: string; color: string; icon: string }> = {
  paid: { label: 'Pagada', color: 'success', icon: 'mdi-check-circle-outline' },
  pending: { label: 'Pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  refunded: { label: 'Reembolsada', color: 'secondary', icon: 'mdi-undo-variant' },
  failed: { label: 'Fallida', color: 'error', icon: 'mdi-alert-circle-outline' },
}

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

/** What the server answers when a refund is not possible, in words for the team. */
export function refundError(codes: string[] | undefined, fallback: string): string {
  if (codes?.includes('event_published')) return 'No se puede reembolsar: el evento ya está publicado. El reembolso total solo es posible mientras la invitación no se haya publicado.'
  if (codes?.includes('not_paid')) return 'No se puede reembolsar: esta compra no está pagada (o ya fue reembolsada).'
  return fallback
}

/** Why a paid purchase cannot be refunded now, or null when it can. */
export function refundBlockReason(p: { status: PurchaseStatus; canRefund: boolean }): string | null {
  if (p.status !== 'paid') return null
  return p.canRefund ? null : 'No se puede reembolsar: el evento ya está publicado. El reembolso total solo es posible mientras la invitación no se haya publicado.'
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
