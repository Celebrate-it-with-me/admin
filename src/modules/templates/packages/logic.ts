import type { Locale } from '../types'
import type { PackageError, PackageManifest, PackageStatus, PackageSummary, ReportItem, ValidationReport, Visibility } from './types'

/** Pure helpers of the package screens: labels, upload checks, report grouping, checklist and error mapping. */

export const MAX_ZIP_BYTES = 8 * 1024 * 1024
export const MIN_REASON = 5

export const STATUS_LABEL: Record<PackageStatus, string> = {
  installed: 'Borrador', active: 'Activo', deactivated: 'Desactivado', withdrawn: 'Retirado',
}
export const STATUS_COLOR: Record<PackageStatus, string> = {
  installed: 'accent', active: 'success', deactivated: 'secondary', withdrawn: 'error',
}
export const STATUS_ICON: Record<PackageStatus, string> = {
  installed: 'mdi-pencil-outline', active: 'mdi-check-circle-outline', deactivated: 'mdi-pause-circle-outline', withdrawn: 'mdi-archive-outline',
}
export const VISIBILITY_LABEL: Record<Visibility, string> = { public: 'Público', private: 'Privado' }
export const TIER_LABEL: Record<string, string> = { free: 'Gratis', premium: 'Premium' }
export const EVENT_TYPE_LABEL: Record<string, string> = { quinceanera: 'Quinceañera', wedding: 'Boda' }

export const eventTypesLabel = (types: string[]) => types.map(t => EVENT_TYPE_LABEL[t] ?? t).join(' y ')

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Only `.zip`, at most 8 MB. Returns the message to show or null when the file can be sent (the API checks again). */
export function checkZip(file: { name: string; size: number }): string | null {
  if (!/\.zip$/i.test(file.name)) return 'Solo se aceptan archivos .zip.'
  if (file.size === 0) return 'El archivo está vacío.'
  if (file.size > MAX_ZIP_BYTES) return `El archivo pesa ${formatBytes(file.size)}; el máximo es 8 MB.`
  return null
}

// --- Validation report -------------------------------------------------------------------------------------------

/** What each code means and how to fix it (spec §4.8 and the sanitizer spike). The server's own message is shown too. */
export const CODE_HELP: Record<string, string> = {
  not_a_zip: 'El archivo no es un .zip válido.',
  zip_encrypted: 'El zip está cifrado. Súbelo sin contraseña.',
  zip_symlink: 'El zip contiene enlaces simbólicos. Empaqueta los archivos reales.',
  zip_path_traversal: 'Una ruta intenta salir de la carpeta (..). Usa rutas relativas simples.',
  zip_absolute_path: 'Una ruta empieza con / . Todas deben ser relativas a la raíz del zip.',
  zip_too_many_files: 'Hay demasiados archivos (máximo 120).',
  zip_bomb: 'El contenido descomprimido es desproporcionado (máximo 12 MB y ratio 100:1).',
  zip_nested: 'Hay un zip dentro del zip. No se permiten.',
  unexpected_root: 'Todo debe ir en la raíz del zip, sin carpeta envolvente.',
  name_invalid: 'Los nombres van en minúsculas, sin espacios ni caracteres raros.',
  name_duplicate: 'Dos archivos se llaman igual (sin distinguir mayúsculas).',
  ext_not_allowed: 'Esa extensión no está permitida en un paquete.',
  mime_mismatch: 'El contenido del archivo no coincide con su extensión.',
  file_too_large: 'El archivo supera el tamaño máximo permitido para su tipo.',
  package_too_large: 'El paquete supera el tamaño total permitido.',
  manifest_missing: 'Falta manifest.json en la raíz.',
  manifest_invalid: 'manifest.json tiene campos que faltan o no son válidos.',
  slug_invalid: 'El slug debe ser minúsculas, números y guiones (2 a 32 caracteres, empieza con letra).',
  slug_taken: 'Ya existe otro paquete con ese slug que no es de este autor o nivel.',
  version_invalid: 'La versión debe ser semver MAJOR.MINOR.PATCH, sin prerelease.',
  version_not_greater: 'La versión debe ser mayor que todas las ya instaladas de este slug.',
  visibility_changed: 'La visibilidad no puede cambiar entre versiones de un mismo slug.',
  level_not_allowed: 'Un zip solo puede ser de nivel 1.',
  level2_slug_not_registered: 'Ese slug de nivel 2 no está registrado en la API.',
  engine_too_new: 'El paquete necesita un motor más nuevo que el que está desplegado.',
  tokens_invalid: 'tokens.json tiene colores, tipografías o presets no válidos.',
  color_invalid: 'Un color no es hexadecimal válido (#rgb, #rrggbb…).',
  font_missing_file: 'Una tipografía declara un archivo .woff2 que no está en el zip.',
  font_not_self_hosted: 'Las tipografías deben ir dentro del zip (.woff2); no se cargan de Google.',
  woff2_invalid: 'Un archivo .woff2 está dañado o no es woff2.',
  editable_invalid: 'editable.json no cumple el esquema.',
  editable_bind_unknown: 'Un campo editable apunta a algo que no existe.',
  variant_unknown: 'Una variante declarada no existe en el motor.',
  sections_invalid: 'sections.json no cumple el esquema de secciones.',
  license_missing: 'Falta la licencia en el manifiesto o LICENSES.md.',
  license_asset_missing: 'Un archivo de assets/ no tiene crédito en assetsCredits.',
  license_asset_unknown: 'Hay un crédito de un archivo que no existe.',
  preview_missing: 'Faltan las capturas de preview/ (mobile.png y desktop.png).',
  preview_size: 'Una captura de preview/ no tiene las dimensiones pedidas.',
  image_decode: 'No se pudo leer una imagen: está dañada.',
  image_dimensions: 'Una imagen supera el límite de dimensiones.',
  svg_invalid: 'Un SVG no se puede leer.',
  svg_doctype: 'Un SVG declara DOCTYPE o ENTITY. Quítalos.',
  svg_forbidden_element: 'Un SVG usa un elemento no permitido (script, texto, imagen…).',
  svg_forbidden_attribute: 'Un SVG usa un atributo no permitido (on*, style, class…).',
  svg_external_ref: 'Un SVG apunta a algo externo. Solo se admiten referencias #id internas.',
  css_parse_error: 'El CSS tiene un error de sintaxis.',
  css_backslash: 'El CSS contiene "\\", que no se permite.',
  css_import: '@import no está permitido.',
  css_forbidden_at_rule: 'Esa regla @ no está permitida (@font-face lo genera el servidor).',
  css_forbidden_property: 'El CSS usa una propiedad que un paquete no puede usar.',
  css_selector_forbidden: 'El CSS usa un selector fuera de lo permitido.',
  css_url_external: 'url() solo puede apuntar a archivos de assets/ del paquete.',
  css_inv_var: 'Las variables --inv-* no se pueden declarar; usa --pkg-*.',
  css_important: '!important no está permitido.',
  css_size: 'El CSS es demasiado grande.',
  third_party_marks_public: 'Un paquete con marcas de terceros solo puede ser privado.',
  unexpected_file: 'Hay un archivo que el paquete no reconoce.',
  layout_outlet: 'layout.html debe llevar exactamente un <q-sections>.',
  section_block_required: 'Una sección debe usar al menos un bloque del sistema.',
  img_alt_missing: 'Una imagen no tiene texto alternativo (alt).',
  img_size_missing: 'Una imagen no declara width y height.',
  // warnings
  unused_file: 'Un archivo del paquete no se usa en ningún sitio.',
  budget_exceeded: 'El peso en tiempo de ejecución pasa del objetivo (350 KB).',
  first_fold_budget: 'El primer pliegue pasa del objetivo (180 KB).',
  field_removed: 'Se quitó un campo editable respecto a la versión anterior: usa una versión mayor.',
  variant_removed: 'Se quitó un valor de variante respecto a la versión anterior: usa una versión mayor.',
  ignored_file: 'Se ignoró un archivo de sistema (por ejemplo __MACOSX o .DS_Store).',
  empty_css: 'theme.css está vacío; el paquete solo usará los tokens.',
  third_party_marks_declared: 'El paquete declara marcas de terceros: revisa la autorización de uso.',
  css_costly_property: 'Una propiedad o filtro es costoso de pintar en móviles modestos.',
  contrast_low: 'El contraste de algún par de colores es bajo (informativo).',
}

export const codeHelp = (code: string) => CODE_HELP[code] ?? null

export interface ReportGroup {
  /** `null` file = problems of the package as a whole. */
  file: string | null
  label: string
  errors: ReportItem[]
  warnings: ReportItem[]
}

const WHOLE = 'Paquete (general)'

/** Groups errors and warnings by file: files with errors first, then by name; the general bucket goes first. */
export function groupReport(report: Pick<ValidationReport, 'errors' | 'warnings'>): ReportGroup[] {
  const map = new Map<string, ReportGroup>()
  const bucket = (file: string | null | undefined) => {
    const key = file ?? ''
    let g = map.get(key)
    if (!g) { g = { file: file ?? null, label: file || WHOLE, errors: [], warnings: [] }; map.set(key, g) }
    return g
  }
  for (const e of report.errors ?? []) bucket(e.file).errors.push(e)
  for (const w of report.warnings ?? []) bucket(w.file).warnings.push(w)
  const lineOf = (i: ReportItem) => i.line ?? Number.MAX_SAFE_INTEGER
  for (const g of map.values()) { g.errors.sort((a, b) => lineOf(a) - lineOf(b)); g.warnings.sort((a, b) => lineOf(a) - lineOf(b)) }
  return [...map.values()].sort((a, b) => {
    if (a.file === null) return -1
    if (b.file === null) return 1
    if ((a.errors.length > 0) !== (b.errors.length > 0)) return a.errors.length > 0 ? -1 : 1
    return a.label.localeCompare(b.label)
  })
}

export const reportCounts = (report: Pick<ValidationReport, 'errors' | 'warnings'>) => ({
  errors: report.errors?.length ?? 0,
  warnings: report.warnings?.length ?? 0,
})

export const hasMarkWarning = (report: Pick<ValidationReport, 'warnings'>) =>
  (report.warnings ?? []).some(w => w.code === 'third_party_marks_declared')

// --- Quality checklist (decision of the owner: review before activating) -----------------------------------------

export interface ChecklistItem { id: string; label: string; hint: string }

export const CHECKLIST: ChecklistItem[] = [
  { id: 'accessibility', label: 'Accesibilidad', hint: 'Se navega con teclado, el foco se ve, las imágenes decorativas no se leen y los encabezados siguen un orden lógico.' },
  { id: 'contrast', label: 'Contraste', hint: 'El texto tiene al menos 4,5:1 sobre su fondo (3:1 en letra script grande) en cada preset.' },
  { id: 'long_names', label: 'Nombres largos', hint: 'Un nombre de 40 o más caracteres y un itinerario de 8 momentos no se desbordan ni se cortan.' },
  { id: 'no_photo', label: 'Sin foto', hint: 'La portada sin foto y el estado «Guarda la fecha» se ven completos, sin huecos.' },
  { id: 'sections_reordered', label: 'Secciones apagadas y reordenadas', hint: 'Al apagar o mover secciones no queda decoración huérfana.' },
  { id: 'performance', label: 'Rendimiento', hint: 'El peso está dentro del presupuesto y la portada aparece rápido en un móvil modesto.' },
]

export interface ChecklistEntry { by: string; at: string }
export type ChecklistState = Record<string, ChecklistEntry>

/** Body of `activate.checklist`: the six keys, all true (the server records who and when in the audit log). */
export const checklistPayload = (): Record<string, true> => Object.fromEntries(CHECKLIST.map(i => [i.id, true])) as Record<string, true>

export const checklistDone = (state: ChecklistState) => CHECKLIST.every(i => Boolean(state[i.id]))
export const checklistProgress = (state: ChecklistState) => CHECKLIST.filter(i => Boolean(state[i.id])).length

const checklistKey = (packageId: number) => `qv.admin.pkg-checklist.${packageId}`

/**
 * UI help only: the server records the checklist when activating (`activate.checklist`); this just keeps the ticks between visits.
 * It stores nothing but the ids ticked and when (no names, no tokens). What it reads back is untrusted: only known ids with a date survive,
 * and `by` is always the current reviewer, never something taken from storage.
 */
export function loadChecklist(packageId: number, reviewer = 'Revisor'): ChecklistState {
  try {
    const raw = window.localStorage.getItem(checklistKey(packageId))
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: ChecklistState = {}
    for (const item of CHECKLIST) {
      const at = (parsed as Record<string, { at?: unknown } | null>)[item.id]?.at
      if (typeof at === 'string' && at.length <= 40 && !Number.isNaN(new Date(at).getTime())) out[item.id] = { by: reviewer, at }
    }
    return out
  } catch { return {} }
}

export function saveChecklist(packageId: number, state: ChecklistState): void {
  try {
    const slim = Object.fromEntries(Object.entries(state).map(([id, e]) => [id, { at: e.at }]))
    window.localStorage.setItem(checklistKey(packageId), JSON.stringify(slim))
  } catch { /* private window: it just does not persist */ }
}

// --- Preview coverage (W6-09): the checklist opens only after the reviewer has looked at the package ----------------

export type PreviewDevice = 'mobile' | 'desktop'
export const PREVIEW_DEVICES: { value: PreviewDevice; label: string }[] = [{ value: 'mobile', label: 'móvil' }, { value: 'desktop', label: 'escritorio' }]

export interface PreviewCoverage { devices: PreviewDevice[]; states: string[] }
export const emptyCoverage = (): PreviewCoverage => ({ devices: [], states: [] })

/** What the reviewer still has to open in the preview, as words ("escritorio", "Sin foto"). Empty when nothing is missing. */
export function coverageMissing(c: PreviewCoverage): string[] {
  return [
    ...PREVIEW_DEVICES.filter(d => !c.devices.includes(d.value)).map(d => d.label),
    ...PREVIEW_STATES.filter(s => !c.states.includes(s.value)).map(s => s.label),
  ]
}
export const coverageDone = (c: PreviewCoverage) => coverageMissing(c).length === 0

// --- Links that come from the package (W6-01) ---------------------------------------------------------------------

const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp', '.intranet']

/**
 * A link written by the package author is third-party text: it becomes a clickable link only when it is a plain `https:` URL
 * with a public-looking host (no credentials, `localhost`, internal TLD or literal IP). Anything else returns null and
 * the caller shows it as text. Returns the normalised href.
 */
export function safeExternalUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.trim()
  if (text.length === 0 || text.length > 2048) return null
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0020\u007f-\u009f\\]/.test(text)) return null
  if (!/^https:\/\/[^/?#]/i.test(text)) return null
  let u: URL
  try { u = new URL(text) } catch { return null }
  if (u.protocol !== 'https:' || u.username || u.password) return null
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  if (!host || host.startsWith('[') || host.includes(':')) return null
  if (/^(\d+|0x[0-9a-f]*)$/i.test(host.split('.').pop() ?? '')) return null // IPv4 literal in any notation
  if (host === 'localhost' || BLOCKED_SUFFIXES.some(s => host.endsWith(s))) return null
  if (!host.includes('.')) return null
  return u.href
}

// --- Lists and actions -------------------------------------------------------------------------------------------

export const canActivate = (p: Pick<PackageSummary, 'status'>) => p.status === 'installed' || p.status === 'deactivated'
export const canDeactivate = (p: Pick<PackageSummary, 'status'>) => p.status === 'active'
export const canWithdraw = (p: Pick<PackageSummary, 'status'>) => p.status !== 'withdrawn'

export const eventsPinnedLabel = (n: number) => (n === 1 ? '1 evento' : `${n} eventos`)

export function impactMessage(unpublished: number): string {
  if (unpublished === 0) return 'Ningún evento sin publicar usa este paquete.'
  return `${unpublished === 1 ? '1 evento sin publicar usa' : `${unpublished} eventos sin publicar usan`} este paquete y pasará${unpublished === 1 ? '' : 'n'} a la plantilla gratuita.`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

// --- Errors ------------------------------------------------------------------------------------------------------

const ERROR_BY_CODE: Record<string, string> = {
  package_not_found: 'No encontramos ese paquete.',
  stage_not_found: 'La subida ya no existe. Vuelve a subir el .zip.',
  stage_expired: 'La subida caducó. Vuelve a subir el .zip.',
  package_exists: 'Esa versión del paquete ya está instalada.',
  draft_exists: 'Una de las plantillas del paquete ya tiene un borrador abierto. Publícalo o archívalo antes de instalar.',
  package_not_installable: 'El paquete no está en un estado que permita activarlo.',
  package_not_active: 'El paquete no está activo.',
  package_in_use: 'Hay eventos fijados a este paquete: no se puede retirar.',
  package_not_private: 'Solo los paquetes privados tienen accesos.',
  package_managed: 'Esta versión la gestiona un paquete y no se edita aquí.',
  grant_exists: 'Ya existe un acceso vigente para ese destino.',
  grant_not_found: 'No encontramos ese acceso.',
  grant_revoked: 'Ese acceso ya estaba revocado.',
  too_many_attempts: 'Demasiados intentos seguidos. Espera un minuto e inténtalo de nuevo.',
  engine_too_new: 'El paquete necesita un motor más nuevo que el desplegado.',
}
const FIELD_ERROR: Record<string, string> = {
  required: 'Es obligatorio.',
  not_a_zip: 'El archivo no es un .zip válido.',
  too_large: 'El archivo supera el máximo de 8 MB.',
  invalid_report: 'El informe tiene errores: corrígelos y vuelve a subir el paquete.',
  engine_too_new: 'El paquete necesita un motor más nuevo que el desplegado.',
  required_one: 'Indica un evento o una cuenta.',
  incomplete: 'Falta marcar puntos de la lista de comprobación.',
  not_found: 'No lo encontramos.',
}

/** Turns a failed request into something the screens can show. Never throws. */
export function explainPackageError(e: unknown): PackageError {
  const err = e as {
    reauthCancelled?: boolean
    response?: { status?: number; data?: { code?: string; message?: string; eventsPinned?: number; packageId?: number; errors?: Record<string, string[]> } }
  }
  if (err?.reauthCancelled) {
    return { code: 'reauth_cancelled', status: 403, message: 'No se confirmó tu contraseña, así que no se hizo nada.', fields: {}, eventsPinned: null, packageId: null, reauthCancelled: true }
  }
  if (!err?.response) {
    return { code: null, status: null, message: 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.', fields: {}, eventsPinned: null, packageId: null, reauthCancelled: false }
  }
  const { status = null, data } = err.response
  const code = data?.code ?? null
  const fields: Record<string, string> = {}
  for (const [key, messages] of Object.entries(data?.errors ?? {})) fields[key] = messages?.[0] ?? ''
  let message = 'No pudimos hacerlo. Inténtalo de nuevo.'
  if (code && ERROR_BY_CODE[code]) message = ERROR_BY_CODE[code]
  else if (status === 429) message = ERROR_BY_CODE.too_many_attempts
  else if (status === 403) message = 'Solo un superadmin puede gestionar los paquetes de plantilla.'
  else if (status === 404) message = 'No encontramos lo que buscabas.'
  else if (status === 413) message = 'El archivo es demasiado grande para el servidor.'
  else if (status === 422) {
    const first = Object.entries(fields)[0]
    if (fields.reason) message = `Escribe un motivo de al menos ${MIN_REASON} caracteres.`
    else if (fields.ack_third_party_marks) message = 'Confirma que revisaste la autorización de uso de las marcas de terceros.'
    else if (fields.checklist) message = FIELD_ERROR.incomplete
    else if (first) message = FIELD_ERROR[first[1]] ?? ERROR_BY_CODE[first[1]] ?? data?.message ?? 'Los datos no son válidos.'
    else message = data?.message ?? 'Los datos no son válidos.'
  }
  return { code, status, message, fields, eventsPinned: data?.eventsPinned ?? null, packageId: data?.packageId ?? null, reauthCancelled: false }
}

/** Options of the preset selector of the preview, from the manifest's tokens when the API sends them. */
export function presetOptions(presets: PackageManifest['presets'] | undefined): { id: string; label: string }[] {
  return Object.entries(presets ?? {}).map(([id, p]) => ({ id, label: p?.label?.es ?? p?.label?.en ?? id }))
}

export const localeName = (l: Locale) => (l === 'es' ? 'Español' : 'Inglés')

export const PREVIEW_STATES: { value: 'invitation' | 'save_the_date' | 'no_photo'; label: string }[] = [
  { value: 'invitation', label: 'Invitación' },
  { value: 'save_the_date', label: 'Guarda la fecha' },
  { value: 'no_photo', label: 'Sin foto' },
]
