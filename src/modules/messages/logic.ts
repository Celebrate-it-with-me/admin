/** Pure helpers of Textos de mensajes: variables, the contract's rules, labels and error messages. */
import type { FieldDetail, FieldErrors, Locale, Message, MessageError } from './types'

export const REASON_MIN = 5
export const LOCALES: { value: Locale; title: string }[] = [
  { value: 'es', title: 'Español' },
  { value: 'en', title: 'English' },
]
export const localeTitle = (locale: Locale): string => LOCALES.find(l => l.value === locale)?.title ?? locale

/** Name shown for each field of the texts (the API sends the keys of `mail.php` of each language). */
const FIELD_LABELS: Record<string, string> = {
  subject: 'Asunto', preheader: 'Texto previo', title: 'Título', intro: 'Introducción', action: 'Texto del botón', outro: 'Cierre',
}
export const fieldLabel = (field: string): string => FIELD_LABELS[field] ?? field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ')

const FIELD_HINTS: Record<string, string> = {
  subject: 'Lo que se ve en la bandeja de entrada.',
  preheader: 'La línea gris que se ve junto al asunto.',
  action: 'Lo que dice el botón; el enlace lo pone la plantilla.',
}
export const fieldHint = (field: string): string => FIELD_HINTS[field] ?? ''

/** Fields that are one line; the rest are paragraphs. */
export const isShortField = (field: string): boolean => ['subject', 'preheader', 'title', 'action'].includes(field)

// ── variables ──

// `:name` markers, not glued to a word (so Nota:algo or a URL are not markers).
const MARKER = /(?<![A-Za-z0-9_]):([A-Za-z_][A-Za-z0-9_]*)/g
export function extractVariables(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(MARKER), m => m[1])))
}
/** Markers of the original that the text lost. */
export const missingVariables = (text: string, required: string[]): string[] => {
  const has = new Set(extractVariables(text))
  return required.filter(v => !has.has(v))
}
/** Markers the text added that the original does not have. */
export const unknownVariables = (text: string, required: string[]): string[] => extractVariables(text).filter(v => !required.includes(v))

// ── format ──

const HTML = /<\/?[a-z!][^>]*>/i
const LINK = /https?:\/\/|www\.|\]\(|mailto:|[^\s@]+@[^\s@]+\.[a-z]{2,}/i
export const hasHtml = (text: string): boolean => HTML.test(text)
export const hasLink = (text: string): boolean => LINK.test(text)

/** The contract's rules for one field, in the order the API checks them; null when the text is fine. */
export function validateField(text: string, field: Pick<FieldDetail, 'variables' | 'maxLength'>): string | null {
  if (!text.trim()) return 'required'
  if (text.length > field.maxLength) return 'too_long'
  if (hasHtml(text)) return 'html_not_allowed'
  if (hasLink(text)) return 'links_not_allowed'
  if (missingVariables(text, field.variables).length) return 'missing_variable'
  if (unknownVariables(text, field.variables).length) return 'unknown_variable'
  return null
}

/** Error code per edited field, only for the ones that changed. */
export function validateForm(form: Record<string, string>, fields: Record<string, FieldDetail>): FieldErrors {
  const out: FieldErrors = {}
  for (const [name, f] of Object.entries(fields)) {
    if (form[name] === undefined || form[name] === f.current) continue
    const code = validateField(form[name], f)
    if (code) out[name] = code
  }
  return out
}

/** Only the fields whose text changed (what PUT and the preview send). */
export function changedFields(form: Record<string, string>, fields: Record<string, FieldDetail>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [name, f] of Object.entries(fields)) if (form[name] !== undefined && form[name] !== f.current) out[name] = form[name]
  return out
}

export const formFrom = (fields: Record<string, FieldDetail>): Record<string, string> =>
  Object.fromEntries(Object.entries(fields).map(([name, f]) => [name, f.current]))

// ── list ──

export const isEdited = (m: Message, locale: Locale): boolean => m.overridden?.[locale] === true
export const matchesSearch = (m: Message, query: string): boolean => {
  const q = query.trim().toLowerCase()
  return !q || [m.name, m.key, m.description].some(t => t.toLowerCase().includes(q))
}

const DATE_TIME = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE_TIME.format(d)
}

// ── errors ──

export const ERROR_MESSAGES: Record<string, string> = {
  required: 'Este texto no puede quedar vacío. Para volver al original usa «Restaurar original».',
  missing_variable: 'Falta conservar un marcador del texto original.',
  unknown_variable: 'Hay un marcador que no existe en el texto original.',
  html_not_allowed: 'No uses HTML. Solo se admite **negrita**, *cursiva* y saltos de línea.',
  links_not_allowed: 'No escribas enlaces: los botones y enlaces los pone la plantilla.',
  not_editable: 'Este campo no se puede editar.',
  invalid: 'Ese idioma no es válido.',
  not_staff: 'Solo se puede enviar a direcciones del equipo del panel.',
  message_not_found: 'Este mensaje ya no existe.',
  reauth_required: 'Confirma tu identidad para continuar.',
  reason: 'Escribe un motivo de al menos 5 caracteres.',
}

const list = (names: string[]) => names.map(n => `:${n}`).join(', ')

/** Message of a field's code; for variables it names them when it can compute them from the text. */
export function fieldMessage(code: string, ctx?: { text?: string; field?: Pick<FieldDetail, 'variables' | 'maxLength'> }): string {
  const { text, field } = ctx ?? {}
  if (code === 'too_long') return field ? `Máximo ${field.maxLength} caracteres.` : 'Es demasiado largo.'
  if (code === 'missing_variable' && text !== undefined && field) {
    const missing = missingVariables(text, field.variables)
    if (missing.length) return `Falta conservar ${list(missing)}: es un dato que se rellena solo al enviar el correo.`
  }
  if (code === 'unknown_variable' && text !== undefined && field) {
    const extra = unknownVariables(text, field.variables)
    if (extra.length) return `${list(extra)} no existe en el texto original. Quítalo o escríbelo sin los dos puntos.`
  }
  return ERROR_MESSAGES[code] ?? code
}

interface ApiError {
  reauthCancelled?: boolean
  response?: { status?: number; data?: { message?: string; code?: string; errors?: Record<string, string[]> } }
}

/** First code of each field in a 422; `fields.subject` becomes `subject`. */
export function serverFieldErrors(e: unknown): FieldErrors {
  const out: FieldErrors = {}
  for (const [path, codes] of Object.entries((e as ApiError)?.response?.data?.errors ?? {})) {
    if (codes?.[0]) out[path.startsWith('fields.') ? path.slice('fields.'.length) : path] = codes[0]
  }
  return out
}

export function parseError(e: unknown, fallback = 'No pudimos hacerlo. Inténtalo de nuevo.'): MessageError {
  const err = e as ApiError
  if (err?.reauthCancelled) return { code: null, field: null, message: 'No se hizo ningún cambio: cancelaste la confirmación de identidad.' }
  const res = err?.response
  if (!res) return { code: null, field: null, message: 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' }
  const code = res.data?.code
  if (code && ERROR_MESSAGES[code]) return { code, field: null, message: ERROR_MESSAGES[code] }
  const first = Object.entries(serverFieldErrors(e))[0]
  if (first) return { code: first[1], field: first[0], message: ERROR_MESSAGES[first[1]] ?? fallback }
  if (res.status === 429) return { code: null, field: null, message: 'Demasiados intentos. Espera un rato e inténtalo de nuevo (el límite es de 5 pruebas por hora).' }
  if (res.status === 403) return { code: code ?? null, field: null, message: 'No tienes permiso para hacer esto.' }
  if (res.status === 404) return { code: 'message_not_found', field: null, message: ERROR_MESSAGES.message_not_found }
  return { code: code ?? null, field: null, message: fallback }
}
