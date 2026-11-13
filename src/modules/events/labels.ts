import type { EventFilters, EventStage, EventStatus } from './types'

/** Pure helpers of the Events module: labels, chip colors and request parameters. */

export interface Tone { label: string; color: string; icon?: string }

export const STATUS: Record<EventStatus, Tone> = {
  draft: { label: 'Borrador', color: 'warning', icon: 'mdi-pencil-outline' },
  published: { label: 'Publicado', color: 'success', icon: 'mdi-check-circle-outline' },
  archived: { label: 'Archivado', color: 'secondary', icon: 'mdi-archive-outline' },
}
export const STAGE: Record<EventStage, Tone> = {
  save_the_date: { label: 'Save the date', color: 'info', icon: 'mdi-calendar-star' },
  invitation: { label: 'Invitación', color: 'primary', icon: 'mdi-email-heart-outline' },
}
export const PLAN_COLOR: Record<string, string> = { basic: 'secondary', premium: 'primary', lux: 'accent' }

export const STATUS_OPTIONS = (Object.keys(STATUS) as EventStatus[]).map(value => ({ value, title: STATUS[value].label }))
export const STAGE_OPTIONS = (Object.keys(STAGE) as EventStage[]).map(value => ({ value, title: STAGE[value].label }))
export const PLAN_OPTIONS = [{ value: 'basic', title: 'Basic' }, { value: 'premium', title: 'Premium' }, { value: 'lux', title: 'Lux' }]
export const TYPE_OPTIONS = [
  { value: 'quinceanera', title: 'Quinceañera' }, { value: 'wedding', title: 'Boda' }, { value: 'birthday', title: 'Cumpleaños' },
  { value: 'baby-shower', title: 'Baby shower' }, { value: 'graduation', title: 'Graduación' },
]
export const SORT_OPTIONS = [{ value: 'createdAt', title: 'Más recientes' }, { value: 'startDate', title: 'Fecha del evento' }]

export const typeName = (type: { slug: string; name: string } | null) =>
  type ? (TYPE_OPTIONS.find(t => t.value === type.slug)?.title ?? type.name) : '—'

export const PURCHASE: Record<string, Tone> = {
  paid: { label: 'Pagado', color: 'success', icon: 'mdi-check-circle-outline' },
  pending: { label: 'Pago pendiente', color: 'warning', icon: 'mdi-clock-outline' },
  failed: { label: 'Pago fallido', color: 'error', icon: 'mdi-alert-circle-outline' },
  refunded: { label: 'Reembolsado', color: 'info', icon: 'mdi-cash-refund' },
}
export const purchaseTone = (status: string | null): Tone | null =>
  status ? (PURCHASE[status] ?? { label: status, color: 'secondary' }) : null

export const MODULE_LABEL: Record<string, string> = {
  timeline: 'Cronograma', guests: 'Invitados', invitation: 'Invitación', menus: 'Menús', locations: 'Lugares',
  rsvp: 'Confirmaciones', seating: 'Mesas', dress_code: 'Código de vestimenta', suggested_music: 'Música sugerida',
  save_the_date: 'Save the date', budget: 'Presupuesto', memories: 'Recuerdos', comments: 'Comentarios', padrinos: 'Padrinos',
}
export const moduleLabel = (key: string) => MODULE_LABEL[key] ?? key

export const ROLE_LABEL: Record<string, string> = { owner: 'Dueña', editor: 'Editora', viewer: 'Solo lectura' }
export const roleLabel = (role: string) => ROLE_LABEL[role] ?? role

/** The API sends the activity message in English: show our own text by type. */
export const ACTIVITY_LABEL: Record<string, string> = {
  event_created: 'Se creó el evento', event_updated: 'Se actualizó el evento', event_published: 'Se publicó el evento',
  event_unpublished: 'El evento volvió a borrador', event_archived: 'Se archivó el evento', event_restored: 'Se restauró el evento',
  guest_created: 'Se agregó un invitado', guest_updated: 'Se actualizó un invitado', guest_deleted: 'Se quitó un invitado',
  guests_imported: 'Se importaron invitados', guest_confirmed: 'Un invitado confirmó asistencia',
  menu_created: 'Se creó un menú', menu_updated: 'Se actualizó un menú', menu_deleted: 'Se quitó un menú',
  menu_item_created: 'Se agregó un plato', menu_item_updated: 'Se actualizó un plato', menu_item_deleted: 'Se quitó un plato',
  photo_uploaded: 'Se subió una foto', music_added: 'Se sugirió una canción',
}
export const activityLabel = (type: string) => ACTIVITY_LABEL[type] ?? 'Actividad en el evento'

export function buildListParams(f: EventFilters, page: number, perPage: number): Record<string, string | number> {
  const p: Record<string, string | number> = { page, perPage, sort: f.sort }
  if (f.search.trim()) p.search = f.search.trim()
  if (f.status) p.status = f.status
  if (f.stage) p.stage = f.stage
  if (f.plan) p.plan = f.plan
  if (f.type) p.type = f.type
  if (f.from) p.from = f.from
  if (f.to) p.to = f.to
  if (f.paymentPending) p.paymentPending = 1
  if (f.internal) p.internal = 1
  return p
}

export const emptyFilters = (): EventFilters => ({
  search: '', status: null, stage: null, plan: null, type: null, from: '', to: '', paymentPending: false, internal: false, sort: 'createdAt',
})

/** Filters that narrow the list (sorting does not count). */
export const hasActiveFilters = (f: EventFilters) =>
  Boolean(f.search.trim() || f.status || f.stage || f.plan || f.type || f.from || f.to || f.paymentPending || f.internal)

export function dateLabel(iso: string | null, withTime = false): string {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso)
  return d.toLocaleString('es-US', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Share (0-100) of guests that confirmed. */
export const attendingPercent = (attending: number, total: number) => (total > 0 ? Math.round((attending / total) * 100) : 0)
