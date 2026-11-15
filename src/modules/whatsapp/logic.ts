/** Pure helpers of the WhatsApp console: statuses, labels, dates, variables, filters and error messages. */
import type {
  Locale, MessageFilters, MessageStatus, PeriodFilter, TemplateKey, TemplateStatus, ViewChip, WaError, WaMessage, WaSummary, WaTemplate,
} from './types'

// ── statuses (always a chip with an icon: colour is never the only signal) ──

export const MESSAGE_STATUS: Record<MessageStatus, ViewChip> = {
  queued: { label: 'En cola', color: 'secondary', icon: 'mdi-clock-outline' },
  sent: { label: 'Enviado', color: 'info', icon: 'mdi-check' },
  delivered: { label: 'Entregado', color: 'success', icon: 'mdi-check-all' },
  read: { label: 'Leído', color: 'primary', icon: 'mdi-eye-check-outline' },
  failed: { label: 'Fallido', color: 'error', icon: 'mdi-alert-circle-outline' },
}

/** A failure where Meta never confirmed (timeout or 5xx): the message may have arrived, so it is not a plain failure. */
export const UNKNOWN_DELIVERY = 'unknown_delivery'
export const UNKNOWN_DELIVERY_CHIP: ViewChip = { label: 'Sin confirmar', color: 'warning', icon: 'mdi-help-circle-outline' }
export const isUnknownDelivery = (m: Pick<WaMessage, 'status' | 'errorCode'>): boolean => m.status === 'failed' && m.errorCode === UNKNOWN_DELIVERY
/** The chip of a message: unconfirmed deliveries get their own, the rest follow the status. */
export const messageChip = (m: Pick<WaMessage, 'status' | 'errorCode'>): ViewChip =>
  isUnknownDelivery(m) ? UNKNOWN_DELIVERY_CHIP : MESSAGE_STATUS[m.status]

export const TEMPLATE_STATUS: Record<TemplateStatus, ViewChip> = {
  draft: { label: 'Borrador', color: 'secondary', icon: 'mdi-pencil-outline' },
  submitted: { label: 'Enviada', color: 'info', icon: 'mdi-send-clock-outline' },
  approved: { label: 'Aprobada', color: 'success', icon: 'mdi-check-decagram-outline' },
  rejected: { label: 'Rechazada', color: 'error', icon: 'mdi-close-octagon-outline' },
  paused: { label: 'Pausada', color: 'warning', icon: 'mdi-pause-circle-outline' },
}

export const TEMPLATE_NAMES: Record<TemplateKey, string> = {
  invitation: 'Invitación',
  save_the_date: 'Guarda la fecha',
  reminder_pending: 'Recordatorio a pendientes',
  rsvp_confirmation: 'Confirmación de asistencia',
  padrino_reminder: 'Recordatorio a padrinos',
}
export const TEMPLATE_KEYS = Object.keys(TEMPLATE_NAMES) as TemplateKey[]
export const LOCALES: Locale[] = ['es', 'en']
export const LOCALE_NAMES: Record<Locale, string> = { es: 'Español', en: 'Inglés' }
export const CATEGORY_NAMES = { utility: 'Utilidad', marketing: 'Marketing' } as const

/** Only an approved template can be sent. */
export const canSubmit = (t: Pick<WaTemplate, 'status'>): boolean => t.status !== 'submitted' && t.status !== 'approved'
export const isSendable = (t: Pick<WaTemplate, 'status'>): boolean => t.status === 'approved'

export function sortTemplates(list: WaTemplate[]): WaTemplate[] {
  const order = (t: WaTemplate) => TEMPLATE_KEYS.indexOf(t.key) * 10 + LOCALES.indexOf(t.locale)
  return [...list].sort((a, b) => order(a) - order(b))
}

// ── dates and numbers ──

export const dateTimeLabel = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

export function agoLabel(iso: string | null | undefined, now = Date.now()): string {
  const time = iso ? new Date(iso).getTime() : NaN
  if (Number.isNaN(time)) return 'Nunca'
  const min = Math.floor(Math.max(0, now - time) / 60_000)
  if (min < 1) return 'Ahora mismo'
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  const days = Math.floor(hours / 24)
  return `hace ${days} ${days === 1 ? 'día' : 'días'}`
}

/** The contract sends the rate as a ratio between 0 and 1; null means nothing was sent yet. */
export function rateLabel(rate: number | null | undefined): string {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return '—'
  const pct = Math.round(rate * 1000) / 10
  return `${pct} %`
}

export const countLabel = (n: number): string => n.toLocaleString('es-US')

/** The last step a message reached, with its date: what the detail shows as a timeline. */
export function messageTimeline(m: WaMessage): { key: string; label: string; at: string | null }[] {
  return [
    { key: 'queued', label: 'En cola', at: m.queuedAt },
    { key: 'sent', label: 'Enviado', at: m.sentAt },
    { key: 'delivered', label: 'Entregado', at: m.deliveredAt },
    { key: 'read', label: 'Leído', at: m.readAt },
    { key: 'failed', label: 'Falló', at: m.failedAt },
  ].filter(step => step.at)
}

// ── template variables ──

/** "{{1}}" for the first variable: the body uses Meta's positional placeholders, in the order the contract fixes. */
export const placeholder = (index: number): string => `{{${index + 1}}}`

const VARIABLE_HELP: Record<string, string> = {
  guest_name: 'Nombre del invitado',
  event_name: 'Nombre del evento',
  event_date: 'Fecha del evento',
  link: 'Enlace a la invitación',
  days_left: 'Días que faltan',
  status_text: 'Respuesta del invitado',
  padrino_name: 'Nombre del padrino',
  item_name: 'Aportación',
  amount: 'Monto',
  due_date: 'Fecha límite',
}
export const variableHelp = (name: string): string => VARIABLE_HELP[name] ?? name

/** Names of the variables, whether the API sends strings or `{ name }` objects. */
export function variableNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map(v => (typeof v === 'string' ? v : (v as { name?: string })?.name ?? '')).filter(Boolean)
}

/** Quick check before sending: every placeholder of the template still appears. The server decides (`variables_changed`). */
export function missingPlaceholders(body: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => placeholder(i)).filter(p => !body.includes(p))
}

export const BODY_MAX = 1024

// ── filters ──

export const emptyPeriod = (): PeriodFilter => ({ from: '', to: '' })
export const emptyMessageFilters = (): MessageFilters => ({ status: null, eventId: null, templateKey: null, q: '' })
export const hasMessageFilters = (f: MessageFilters, p: PeriodFilter): boolean =>
  Boolean(f.status || f.eventId || f.templateKey || f.q.trim() || p.from || p.to)

export function messageParams(f: MessageFilters, p: PeriodFilter, page: number, perPage: number): Record<string, string | number> {
  const out: Record<string, string | number> = { page, per_page: perPage }
  if (f.status) out.status = f.status
  if (f.eventId) out.event_id = f.eventId
  if (f.templateKey) out.template_key = f.templateKey
  if (f.q.trim()) out.q = f.q.trim()
  if (p.from) out.from = p.from
  if (p.to) out.to = p.to
  return out
}

export function summaryParams(p: PeriodFilter): Record<string, string> {
  const out: Record<string, string> = {}
  if (p.from) out.from = p.from
  if (p.to) out.to = p.to
  return out
}

export const SUMMARY_ORDER: { key: keyof WaSummary; label: string; icon: string }[] = [
  { key: 'total', label: 'Mensajes', icon: 'mdi-message-text-outline' },
  { key: 'queued', label: 'En cola', icon: MESSAGE_STATUS.queued.icon },
  { key: 'sent', label: 'Enviados', icon: MESSAGE_STATUS.sent.icon },
  { key: 'delivered', label: 'Entregados', icon: MESSAGE_STATUS.delivered.icon },
  { key: 'read', label: 'Leídos', icon: MESSAGE_STATUS.read.icon },
  { key: 'failed', label: 'Fallidos', icon: MESSAGE_STATUS.failed.icon },
]

// ── connection ──

export function maskedId(id: string | null | undefined): string {
  return id ? id : 'Sin configurar'
}

// ── readable message failures ──

/** Meta error codes and our own, in plain Spanish. Unknown ones show the server text. */
const FAILURE_TEXT: Record<string, string> = {
  '131026': 'Meta no pudo entregarlo: el número no tiene WhatsApp o no puede recibir este mensaje.',
  '131047': 'Pasaron más de 24 horas desde la última respuesta de esa persona; solo se puede escribir con una plantilla aprobada.',
  '131049': 'Meta no entregó el mensaje para cuidar la calidad de la cuenta. Conviene esperar antes de reintentar.',
  '131056': 'Se enviaron demasiados mensajes seguidos a esa persona. Espera un poco.',
  '130429': 'Se alcanzó el límite de velocidad de envío de WhatsApp. Se reintenta más tarde.',
  '132001': 'La plantilla no existe en Meta con ese nombre e idioma. Revisa que esté aprobada.',
  '132012': 'Los datos del mensaje no coinciden con la plantilla aprobada.',
  '132015': 'Meta tiene la plantilla pausada por baja calidad.',
  '133010': 'El número de WhatsApp del negocio no está registrado.',
  unknown_delivery: 'No sabemos si llegó: Meta no confirmó el envío (timeout). No se reintenta solo.',
  invalid_phone: 'El número no es válido. Debe tener código de país, por ejemplo +13055550123.',
  opted_out: 'La persona pidió no recibir más mensajes.',
  template_not_approved: 'La plantilla todavía no está aprobada por Meta.',
  whatsapp_unavailable: 'WhatsApp no está conectado.',
}

export function failureText(m: Pick<WaMessage, 'errorCode' | 'errorMessage'>): string {
  const known = m.errorCode ? FAILURE_TEXT[m.errorCode] : undefined
  return known ?? m.errorMessage ?? (m.errorCode ? `Error ${m.errorCode}.` : 'No sabemos por qué falló.')
}

// ── API errors ──

export const ERROR_MESSAGES: Record<string, string> = {
  whatsapp_unavailable: 'WhatsApp todavía no está conectado a Meta. Completa la configuración de arriba y vuelve a intentarlo.',
  template_not_approved: 'Esa plantilla todavía no está aprobada por Meta, así que no se puede enviar. Envíala a aprobación primero.',
  variables_changed: 'No puedes quitar, repetir ni cambiar el orden de las variables. Vuelve a poner todas las variables en su orden.',
  invalid_phone: 'Ese teléfono no es válido. Escríbelo con código de país, por ejemplo +13055550123.',
  whatsapp_daily_limit: 'Se alcanzó el tope diario de mensajes de WhatsApp. Inténtalo mañana.',
  retry_limit: 'Este mensaje ya se reintentó 3 veces. No se puede reintentar más.',
  reauth_required: 'Confirma tu identidad para continuar.',
  reason: 'Escribe un motivo de al menos 5 caracteres.',
  not_found: 'Esa plantilla ya no existe. Actualiza la lista.',
}

interface ApiError {
  reauthCancelled?: boolean
  response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, string[]> } }
}

/** Turns whatever failed into a message in Spanish; unknown texts pass through. */
export function parseWaError(e: unknown, fallback = 'No pudimos hacerlo. Inténtalo de nuevo.'): WaError {
  const err = e as ApiError
  if (err?.reauthCancelled) return { code: null, field: null, message: 'No se hizo ningún cambio: cancelaste la confirmación de identidad.' }
  const res = err?.response
  if (!res) return { code: null, field: null, message: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' }
  const code = res.data?.code
  if (code && ERROR_MESSAGES[code]) return { code, field: null, message: ERROR_MESSAGES[code] }
  for (const [field, list] of Object.entries(res.data?.errors ?? {})) {
    const first = list?.[0]
    if (!first) continue
    return { code: first, field, message: ERROR_MESSAGES[first] ?? first }
  }
  if (res.status === 429) return { code: null, field: null, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
  if (res.status === 403) return { code: code ?? null, field: null, message: 'No tienes permiso para hacer esto.' }
  if (res.status === 404) return { code: code ?? null, field: null, message: ERROR_MESSAGES.not_found }
  return { code: code ?? null, field: null, message: fallback }
}

export const isForbidden = (e: unknown): boolean => (e as ApiError)?.response?.status === 403
