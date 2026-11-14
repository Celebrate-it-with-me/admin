import type {
  DraftBody, EditorSection, EventTypeSlug, ExplainedError, FieldErrors, Section, TemplateSummary, Theme, ThemeColors, VersionStatus,
} from './types'

/** Pure helpers of the template manager: labels, closed lists, ordering, validation and error mapping. */

/** Cover and RSVP can never be turned off or removed (decision 5 of the contract). */
export const REQUIRED_TYPES = ['cover', 'rsvp']
export const isRequired = (type: string) => REQUIRED_TYPES.includes(type)

export const SECTION_LABEL: Record<string, string> = {
  cover: 'Portada', itinerary: 'Programa del día', locations: 'Lugares', dress_code: 'Código de vestimenta',
  padrinos: 'Padrinos', rsvp: 'Confirmación de asistencia', closing: 'Cierre',
}
export const sectionLabel = (type: string) => SECTION_LABEL[type] ?? type

/** Closed font lists (config/invitation.php). The API rejects anything else with a 422. */
export const FONTS_TEXT = ['Fraunces', 'Figtree', 'Playfair Display', 'Cormorant Garamond', 'Lora', 'Libre Baskerville', 'Montserrat', 'Josefin Sans']
export const FONTS_SCRIPT = ['Pinyon Script', 'Great Vibes', 'Dancing Script', 'Allura']

export const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'surface', label: 'Fondo' },
  { key: 'surfaceAlt', label: 'Fondo alterno' },
  { key: 'ink', label: 'Texto' },
  { key: 'inkSoft', label: 'Texto suave' },
  { key: 'accent', label: 'Acento' },
  { key: 'primary', label: 'Color principal' },
]

export const MAX_TEXT = 1000

/** Hex with 3, 4, 6 or 8 digits (the only color format the API accepts). */
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i
export const isHex = (value: string) => HEX_RE.test(value.trim())

export const STATUS_LABEL: Record<VersionStatus, string> = { draft: 'Borrador', published: 'Publicada', archived: 'Archivada' }
export const STATUS_COLOR: Record<VersionStatus, string> = { draft: 'accent', published: 'success', archived: 'secondary' }

export const eventsLabel = (n: number) => (n === 1 ? '1 evento' : `${n} eventos`)

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

/** The list only carries `eventTypeId`; the seeded slugs end with the event type, so the name comes from there. */
export function eventTypeSlug(template: Pick<TemplateSummary, 'slug'>): EventTypeSlug {
  return template.slug.includes('wedding') ? 'wedding' : 'quinceanera'
}
export const eventTypeLabel = (template: Pick<TemplateSummary, 'slug'>) => (eventTypeSlug(template) === 'wedding' ? 'Boda' : 'Quinceañera')

/** Moves an item and returns a new array (the original is untouched). Out-of-range targets are clamped. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list]
  const target = Math.max(0, Math.min(list.length - 1, to))
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

let seq = 0
export const newKey = () => `s${++seq}`

/** From API sections to editor rows: ordered by `order`, with a stable client key and complete es/en objects. */
export function toEditorSections(sections: Section[]): EditorSection[] {
  return [...sections]
    .sort((a, b) => a.order - b.order)
    .map(s => ({
      ...s,
      key: newKey(),
      title: { es: s.title?.es ?? null, en: s.title?.en ?? null },
      text: { es: s.text?.es ?? null, en: s.text?.en ?? null },
      settings: s.settings && !Array.isArray(s.settings) ? s.settings : {},
    }))
}

/** Rows to the API shape: renumbers `order` from the position, drops the client key, empty texts become null. */
export function toSections(rows: EditorSection[]): Section[] {
  const blank = (v: string | null) => (v == null || v.trim() === '' ? null : v)
  return rows.map((r, i) => ({
    type: r.type,
    enabled: isRequired(r.type) ? true : r.enabled,
    order: i + 1,
    title: { es: blank(r.title.es), en: blank(r.title.en) },
    text: { es: blank(r.text.es), en: blank(r.text.en) },
    settings: r.settings,
  }))
}

export function toBody(rows: EditorSection[], theme: Theme, notes: string): DraftBody {
  return { sections: toSections(rows), theme, notes: notes.trim() === '' ? null : notes }
}

/** A string that changes when the draft changes: the unsaved-changes check compares it with the saved one. */
export const snapshot = (body: DraftBody) => JSON.stringify(body)

/** Errors of the colors of the preset being edited, by color key. Empty when all are valid. */
export function colorErrors(colors: ThemeColors): Partial<Record<keyof ThemeColors, string>> {
  const out: Partial<Record<keyof ThemeColors, string>> = {}
  for (const { key } of COLOR_FIELDS) {
    if (!isHex(colors[key] ?? '')) out[key] = 'Usa un color hex, por ejemplo #b04a62.'
  }
  return out
}

/** Local errors of the whole theme that block saving (the API validates again). */
export function themeProblems(theme: Theme): FieldErrors {
  const out: FieldErrors = {}
  for (const [id, preset] of Object.entries(theme.presets)) {
    for (const [key, message] of Object.entries(colorErrors(preset.colors))) out[`theme.presets.${id}.colors.${key}`] = message as string
  }
  if (!FONTS_TEXT.includes(theme.fonts.heading)) out['theme.fonts.heading'] = 'Elige una tipografía de la lista.'
  if (!FONTS_TEXT.includes(theme.fonts.body)) out['theme.fonts.body'] = 'Elige una tipografía de la lista.'
  if (!FONTS_SCRIPT.includes(theme.fonts.script)) out['theme.fonts.script'] = 'Elige una tipografía de la lista.'
  return out
}

/** Local errors of the sections (length of texts). */
export function sectionProblems(rows: EditorSection[]): FieldErrors {
  const out: FieldErrors = {}
  rows.forEach((r, i) => {
    for (const field of ['title', 'text'] as const) {
      for (const lang of ['es', 'en'] as const) {
        if ((r[field][lang] ?? '').length > MAX_TEXT) out[`sections.${i}.${field}.${lang}`] = `Máximo ${MAX_TEXT} caracteres.`
      }
    }
  })
  return out
}

export const rowHasErrors = (errors: FieldErrors, index: number) => Object.keys(errors).some(k => k.startsWith(`sections.${index}.`))
export const rowErrorCount = (errors: FieldErrors, index: number) => Object.keys(errors).filter(k => k.startsWith(`sections.${index}.`)).length

/** Errors that do not belong to a visible field (e.g. `sections` as a whole, size limits). */
export function unplacedErrors(errors: FieldErrors, rowCount: number): string[] {
  return Object.entries(errors)
    .filter(([key]) => {
      if (/^sections\.(\d+)\.(title|text)\.(es|en)$/.test(key)) return false
      if (/^theme\.fonts\.(heading|body|script)$/.test(key)) return false
      if (/^theme\.presets\.[^.]+\.colors\.[^.]+$/.test(key)) return false
      if (key === 'notes') return false
      return true
    })
    .map(([, message]) => message)
    .concat(rowCount > 20 ? ['Máximo 20 secciones.'] : [])
}

const ERROR_BY_CODE: Record<string, string> = {
  version_immutable: 'Esta versión ya no es un borrador: las versiones publicadas y archivadas no se pueden modificar. Crea un borrador nuevo desde la plantilla.',
  draft_exists: 'La plantilla ya tiene un borrador abierto. Solo puede haber uno a la vez.',
}

/** Turns a failed request into something the screens can show: a sentence, field errors and the codes they act on. */
export function explainError(e: unknown): ExplainedError {
  const err = e as { response?: { status?: number; data?: { code?: string; message?: string; draftVersionId?: number; errors?: Record<string, string[]> } } }
  if (!err?.response) {
    return { code: null, status: null, message: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.', fields: {}, draftVersionId: null }
  }
  const { status = null, data } = err.response
  const code = data?.code ?? null
  const fields: FieldErrors = {}
  for (const [key, messages] of Object.entries(data?.errors ?? {})) fields[key] = messages[0] ?? ''
  let message = 'No pudimos hacerlo. Inténtalo de nuevo.'
  if (code && ERROR_BY_CODE[code]) message = ERROR_BY_CODE[code]
  else if (status === 403) message = 'Solo un superadmin puede gestionar las plantillas.'
  else if (status === 404) message = 'No encontramos esa plantilla o versión.'
  else if (status === 422) {
    message = Object.keys(fields).length > 1 ? 'Hay campos con errores. Revisa los marcados.' : (Object.values(fields)[0] ?? data?.message ?? 'Los datos no son válidos.')
    if (fields.reason) message = 'Escribe un motivo de al menos 5 caracteres.'
  }
  return { code, status, message, fields, draftVersionId: data?.draftVersionId ?? null }
}

/** Origin of a URL, or null when it is not a valid absolute URL. */
export function originOf(url: string): string | null {
  try { return new URL(url).origin } catch { return null }
}

export const publishWarning = (n: number, previousVersion: number | null) => {
  const which = previousVersion ? `la versión ${previousVersion}` : 'la versión anterior'
  if (n === 0) return `Ningún evento usa ${which} todavía.`
  return `${n === 1 ? '1 evento usa' : `${n} eventos usan`} ${which} y no ${n === 1 ? 'cambia' : 'cambian'}.`
}
