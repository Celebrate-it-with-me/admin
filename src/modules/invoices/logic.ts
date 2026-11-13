import type { InvoiceFilters, InvoiceStatus } from './types'

export const emptyFilters = (): InvoiceFilters => ({ search: '', status: null, from: '', to: '' })

export function buildParams(f: InvoiceFilters, page: number, perPage: number) {
  return { page, perPage, search: f.search.trim() || undefined, status: f.status || undefined, from: f.from || undefined, to: f.to || undefined }
}

export const hasAnyFilter = (f: InvoiceFilters): boolean => Boolean(f.search.trim() || f.status || f.from || f.to)

export const STATUS: Record<InvoiceStatus, { label: string; color: string; icon: string }> = {
  issued: { label: 'Emitida', color: 'success', icon: 'mdi-check-circle-outline' },
  void: { label: 'Anulada', color: 'secondary', icon: 'mdi-cancel' },
}

export const METHOD: Record<string, string> = { stripe: 'Tarjeta (Stripe)', manual: 'Pago manual (Zelle)', fake: 'Simulada (pruebas)' }

/** $79, $79.50. */
export function money(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-US', { style: 'currency', currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(cents / 100)
}

export const dateLabel = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const dateTimeLabel = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

export function firstError(e: unknown, fallback: string): string {
  const data = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  return first ?? data?.message ?? fallback
}

/** The email box of the resend dialog: empty (to the buyer) or a plausible address. */
export const validOptionalEmail = (value: string): boolean => value.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
