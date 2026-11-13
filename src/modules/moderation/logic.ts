import type { BulkAction, BulkResult, ItemStatus, ModerationFilters, ModerationItem } from './types'

export const emptyFilters = (): ModerationFilters => ({ type: null, status: null, eventId: '', from: '', to: '', search: '' })

export const itemKey = (i: { type: string; id: number }) => `${i.type}:${i.id}`

/** Query string of the queue: only what is filled in. */
export function buildParams(f: ModerationFilters, page: number, perPage: number) {
  const eventId = f.eventId.trim()
  return {
    page,
    perPage,
    type: f.type || undefined,
    status: f.status || undefined,
    eventId: /^\d+$/.test(eventId) ? eventId : undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    search: f.search.trim() || undefined,
  }
}

export interface StatusInfo { label: string; color: string; icon: string; detail: string | null }

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''

/** Chip of an item: hidden by the organizer (no `hiddenBy`) is not the same as hidden by the team. */
export function statusInfo(item: Pick<ModerationItem, 'status' | 'hiddenBy' | 'hiddenAt'>): StatusInfo {
  const status: ItemStatus = item.status
  if (status === 'pending_review') return { label: 'Pendiente de revisión', color: 'warning', icon: 'mdi-clock-alert-outline', detail: null }
  if (status === 'hidden') {
    if (!item.hiddenBy) return { label: 'Oculto por la organizadora', color: 'secondary', icon: 'mdi-eye-off-outline', detail: item.hiddenAt ? when(item.hiddenAt) : null }
    const detail = `${item.hiddenBy.name}${item.hiddenAt ? ` · ${when(item.hiddenAt)}` : ''}`
    return { label: 'Oculto por el equipo', color: 'error', icon: 'mdi-eye-off', detail }
  }
  return { label: 'Visible', color: 'success', icon: 'mdi-eye-outline', detail: null }
}

export const ACTION_TEXT: Record<BulkAction, { verb: string; past: string; icon: string }> = {
  hide: { verb: 'Ocultar', past: 'ocultados', icon: 'mdi-eye-off-outline' },
  restore: { verb: 'Restaurar', past: 'restaurados', icon: 'mdi-eye-outline' },
  delete: { verb: 'Borrar', past: 'borrados', icon: 'mdi-trash-can-outline' },
}

const ERROR_TEXT: Record<string, string> = {
  storage_failed: 'No se pudo borrar el archivo del almacenamiento. Inténtalo de nuevo.',
  not_found: 'Ya no existe (quizá lo borraron).',
}

/** What to tell the staff member when a call fails. */
export function explainError(e: unknown): string {
  const data = (e as { response?: { data?: { code?: string; message?: string; errors?: Record<string, string[]> } } })?.response?.data
  if (data?.code && ERROR_TEXT[data.code]) return ERROR_TEXT[data.code]
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  if (first) return first
  return 'No pudimos hacerlo. Inténtalo de nuevo.'
}

export const resultError = (r: BulkResult) => (r.error ? (ERROR_TEXT[r.error.code] ?? r.error.message) : '')

/** One-line summary of a bulk result, "3 ocultados, 1 con error". */
export function summarizeBulk(action: BulkAction, succeeded: number, failed: number): string {
  const ok = `${succeeded} ${ACTION_TEXT[action].past}`
  return failed ? `${ok}, ${failed} con error` : ok
}
