/** Pure helpers of Anuncios: levels, audiences, statuses, form <-> body, validation and error messages. */
import type {
  Announcement, AnnouncementBody, AnnouncementError, AnnouncementForm, AnnouncementStatus, Audience, AudienceQuery, FieldErrors, Lang, Level,
} from './types'

export const LIMITS = { title: 80, body: 400, cta: 30, reasonMin: 5, daysMin: 1, daysMax: 365 } as const

export const LEVELS: { value: Level; title: string; hint: string; icon: string; color: string }[] = [
  { value: 'info', title: 'Info', hint: 'Un dato útil, sin urgencia.', icon: 'mdi-information-outline', color: 'info' },
  { value: 'news', title: 'Novedad', hint: 'Algo nuevo en Quinvite.', icon: 'mdi-creation', color: 'primary' },
  { value: 'warning', title: 'Aviso', hint: 'Algo que la organizadora debe saber pronto.', icon: 'mdi-alert-outline', color: 'warning' },
]
export const levelView = (level: Level) => LEVELS.find(l => l.value === level) ?? LEVELS[0]

export const AUDIENCES: { value: Audience; title: string; hint: string }[] = [
  { value: 'all', title: 'Todas las organizadoras', hint: 'Cualquiera que entre a la app.' },
  { value: 'free', title: 'Plan gratis', hint: 'Sin ninguna compra pagada.' },
  { value: 'paid', title: 'Plan completo', hint: 'Con al menos una compra pagada.' },
  { value: 'upcoming_event', title: 'Con un evento próximo', hint: 'Dueñas de un evento que cae dentro de los próximos días que indiques.' },
]
export const audienceLabel = (audience: Audience, days: number | null): string => {
  if (audience === 'upcoming_event') return days ? `Evento en los próximos ${days} ${days === 1 ? 'día' : 'días'}` : 'Con un evento próximo'
  return AUDIENCES.find(a => a.value === audience)?.title ?? audience
}

export interface StatusView { label: string; color: string; icon: string }
export const STATUS_VIEWS: Record<AnnouncementStatus, StatusView> = {
  scheduled: { label: 'Programado', color: 'info', icon: 'mdi-clock-outline' },
  active: { label: 'Activo', color: 'success', icon: 'mdi-check-circle-outline' },
  ended: { label: 'Terminado', color: 'secondary', icon: 'mdi-calendar-check-outline' },
  inactive: { label: 'Inactivo', color: 'warning', icon: 'mdi-pause-circle-outline' },
}
export const STATUS_ORDER: AnnouncementStatus[] = ['scheduled', 'active', 'ended', 'inactive']

// ── dates ──

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO (UTC) -> `YYYY-MM-DDTHH:mm` in the browser's time zone, what `datetime-local` wants. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** `datetime-local` value -> ISO UTC; null when empty or not a date. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const DATE_TIME = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE_TIME.format(d)
}
export const periodLabel = (a: Pick<Announcement, 'startsAt' | 'endsAt'>): string =>
  a.endsAt ? `${formatDateTime(a.startsAt)} → ${formatDateTime(a.endsAt)}` : `Desde ${formatDateTime(a.startsAt)}, sin fin`

// ── form <-> body ──

export function emptyForm(now = new Date()): AnnouncementForm {
  const start = new Date(now)
  start.setSeconds(0, 0)
  return {
    level: 'info', titleEs: '', titleEn: '', bodyEs: '', bodyEn: '', ctaLabelEs: '', ctaLabelEn: '', ctaUrl: '',
    dismissible: true, audience: 'all', upcomingDays: '30', startsAt: toLocalInput(start.toISOString()), endsAt: '', isActive: true,
  }
}

export const formFrom = (a: Announcement): AnnouncementForm => ({
  level: a.level, titleEs: a.titleEs, titleEn: a.titleEn, bodyEs: a.bodyEs, bodyEn: a.bodyEn,
  ctaLabelEs: a.ctaLabelEs ?? '', ctaLabelEn: a.ctaLabelEn ?? '', ctaUrl: a.ctaUrl ?? '', dismissible: a.dismissible,
  audience: a.audience, upcomingDays: a.upcomingDays ? String(a.upcomingDays) : '30',
  startsAt: toLocalInput(a.startsAt), endsAt: toLocalInput(a.endsAt), isActive: a.isActive,
})

const orNull = (text: string): string | null => (text.trim() ? text.trim() : null)

/** Whole days 1-365 from what was typed, or null. */
export function parseDays(text: string): number | null {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return null
  const n = Number(t)
  return n >= LIMITS.daysMin && n <= LIMITS.daysMax ? n : null
}

/** The request body (snake_case). Text is trimmed, empty optional fields go as null, and days only with `upcoming_event`. */
export function toBody(form: AnnouncementForm): AnnouncementBody {
  return {
    level: form.level,
    title_es: form.titleEs.trim(),
    title_en: form.titleEn.trim(),
    body_es: form.bodyEs.trim(),
    body_en: form.bodyEn.trim(),
    cta_label_es: orNull(form.ctaLabelEs),
    cta_label_en: orNull(form.ctaLabelEn),
    cta_url: orNull(form.ctaUrl),
    dismissible: form.dismissible,
    audience: form.audience,
    upcoming_days: form.audience === 'upcoming_event' ? parseDays(form.upcomingDays) : null,
    starts_at: fromLocalInput(form.startsAt) ?? '',
    ends_at: fromLocalInput(form.endsAt),
    is_active: form.isActive,
  }
}

/** The query of audience-preview, or null while the audience is not ready (days missing or out of range). */
export function audienceQuery(audience: Audience, upcomingDays: string): AudienceQuery | null {
  if (audience !== 'upcoming_event') return { audience }
  const days = parseDays(upcomingDays)
  return days === null ? null : { audience, upcoming_days: days }
}

// ── validation (the same codes the API answers) ──

/** `https://…` or an internal path that starts with a single `/`. */
export function isValidCtaUrl(url: string): boolean {
  const u = url.trim()
  if (/\s/.test(u)) return false
  if (u.startsWith('/')) return !u.startsWith('//')
  try {
    const parsed = new URL(u)
    return parsed.protocol === 'https:' && !!parsed.hostname && /^https:\/\/[^/]/i.test(u)
  } catch { return false }
}

export function validate(form: AnnouncementForm): FieldErrors {
  const e: FieldErrors = {}
  const req = (key: keyof AnnouncementBody, value: string, max: number) => {
    const v = value.trim()
    if (!v) e[key] = 'required'
    else if (v.length > max) e[key] = 'too_long'
  }
  req('title_es', form.titleEs, LIMITS.title)
  req('title_en', form.titleEn, LIMITS.title)
  req('body_es', form.bodyEs, LIMITS.body)
  req('body_en', form.bodyEn, LIMITS.body)
  if (form.ctaLabelEs.trim().length > LIMITS.cta) e.cta_label_es = 'too_long'
  if (form.ctaLabelEn.trim().length > LIMITS.cta) e.cta_label_en = 'too_long'
  const url = form.ctaUrl.trim()
  if (url) {
    if (!isValidCtaUrl(url)) e.cta_url = 'invalid_url'
    else {
      if (!form.ctaLabelEs.trim() && !e.cta_label_es) e.cta_label_es = 'cta_label_required'
      if (!form.ctaLabelEn.trim() && !e.cta_label_en) e.cta_label_en = 'cta_label_required'
    }
  }
  if (form.audience === 'upcoming_event' && parseDays(form.upcomingDays) === null) {
    e.upcoming_days = form.upcomingDays.trim() ? 'invalid_days' : 'upcoming_days_required'
  }
  const start = fromLocalInput(form.startsAt)
  if (!start) e.starts_at = 'required'
  const end = fromLocalInput(form.endsAt)
  if (form.endsAt && !end) e.ends_at = 'required'
  else if (start && end && new Date(end) <= new Date(start)) e.ends_at = 'ends_before_start'
  return e
}

export const hasErrors = (e: FieldErrors): boolean => Object.keys(e).length > 0

/** The tab (language) each field belongs to, to mark tabs with a problem. */
export function tabsWithErrors(e: FieldErrors): Record<Lang, boolean> {
  const keys = Object.keys(e)
  return { es: keys.some(k => k.endsWith('_es')), en: keys.some(k => k.endsWith('_en')) }
}

// ── errors ──

export const ERROR_MESSAGES: Record<string, string> = {
  required: 'Este campo es obligatorio.',
  too_long: 'Es demasiado largo.',
  invalid_level: 'Elige un nivel válido.',
  invalid_audience: 'Esa audiencia no existe.',
  invalid_url: 'Escribe una dirección que empiece por https:// o una ruta interna que empiece por /.',
  ends_before_start: 'El fin debe ser posterior al inicio.',
  cta_label_required: 'Si hay botón, escribe su etiqueta en español y en inglés.',
  upcoming_days_required: 'Indica en cuántos días cae el evento (de 1 a 365).',
  invalid_days: 'Escribe un número entero de 1 a 365.',
  announcement_not_found: 'Este anuncio ya no existe. Quizá lo borró otra persona.',
  reauth_required: 'Confirma tu identidad para continuar.',
  reason: 'Escribe un motivo de al menos 5 caracteres.',
}

/** Message of a field's code; `too_long` says the limit. */
export function fieldMessage(field: string, code: string): string {
  if (code === 'too_long') {
    const max = field.startsWith('title') ? LIMITS.title : field.startsWith('body') ? LIMITS.body : LIMITS.cta
    return `Máximo ${max} caracteres.`
  }
  return ERROR_MESSAGES[code] ?? code
}

export const fieldMessages = (e: FieldErrors): Record<string, string> =>
  Object.fromEntries(Object.entries(e).map(([field, code]) => [field, fieldMessage(field, code as string)]))

interface ApiError {
  reauthCancelled?: boolean
  response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, string[]> } }
}

/** First error code of each field in a 422. */
export function serverFieldErrors(e: unknown): FieldErrors {
  const out: Record<string, string> = {}
  for (const [field, list] of Object.entries((e as ApiError)?.response?.data?.errors ?? {})) {
    if (list?.[0]) out[field] = list[0]
  }
  return out as FieldErrors
}

export function parseError(e: unknown, fallback = 'No pudimos hacerlo. Inténtalo de nuevo.'): AnnouncementError {
  const err = e as ApiError
  if (err?.reauthCancelled) return { code: null, field: null, message: 'No se hizo ningún cambio: cancelaste la confirmación de identidad.' }
  const res = err?.response
  if (!res) return { code: null, field: null, message: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' }
  const code = res.data?.code
  if (code && ERROR_MESSAGES[code]) return { code, field: null, message: ERROR_MESSAGES[code] }
  for (const [field, list] of Object.entries(res.data?.errors ?? {})) {
    const first = list?.[0]
    if (first) return { code: ERROR_MESSAGES[first] ? first : null, field, message: fieldMessage(field, first) }
  }
  if (res.status === 429) return { code: null, field: null, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
  if (res.status === 403) return { code: code ?? null, field: null, message: 'No tienes permiso para hacer esto.' }
  if (res.status === 404) return { code: 'announcement_not_found', field: null, message: ERROR_MESSAGES.announcement_not_found }
  return { code: code ?? null, field: null, message: fallback }
}

// ── preview ──

export interface BannerPreview {
  level: Level
  title: string
  body: string
  ctaLabel: string | null
  ctaUrl: string | null
  dismissible: boolean
}

/** The banner as the organizer's app builds it from the localized announcement (plain text; the button only with URL and label). */
export function previewFor(form: AnnouncementForm, lang: Lang): BannerPreview {
  const label = (lang === 'es' ? form.ctaLabelEs : form.ctaLabelEn).trim()
  const url = form.ctaUrl.trim()
  return {
    level: form.level,
    title: lang === 'es' ? form.titleEs : form.titleEn,
    body: lang === 'es' ? form.bodyEs : form.bodyEn,
    ctaLabel: url && label ? label : null,
    ctaUrl: url && label ? url : null,
    dismissible: form.dismissible,
  }
}

export const countLabel = (n: number): string => `${n.toLocaleString('es')} ${n === 1 ? 'organizadora' : 'organizadoras'}`
