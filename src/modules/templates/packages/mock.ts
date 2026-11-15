import type {
  ActivateResult, Grant, Impact, Package, PackageFile, PackagePage, PackagePreviewBody, PackagesQuery, PackageSummary,
  ReportItem, ValidateResult, ValidationReport,
} from './types'

/**
 * In-memory stand-in for the package API, used only with VITE_TEMPLATES_PACKAGES_MOCK=true (and by the tests of the screens).
 * It answers with the contract's shapes and errors. The name of the uploaded file picks the scenario:
 * "errores" -> report with errors and warnings, "marcas" -> valid private package with third-party marks, "grande"/"txt" are caught by the client.
 */

const wait = (ms = 200) => new Promise(r => setTimeout(r, ms))
const fail = (status: number, data: Record<string, unknown>): never => { throw { response: { status, data } } }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const reasonOk = (reason: string) => { if (reason.trim().length < 5) fail(422, { message: 'Invalid', errors: { reason: ['min'] } }) }

const files = (): PackageFile[] => [
  { path: 'theme.css', size: 41200, sha256: 'a'.repeat(64), mime: 'text/css' },
  { path: 'assets/img/wash-a.webp', size: 38400, sha256: 'b'.repeat(64), mime: 'image/webp' },
  { path: 'assets/fonts/cormorant-400.woff2', size: 94100, sha256: 'c'.repeat(64), mime: 'font/woff2' },
]

const manifestOf = (slug: string, marks: boolean): Package['manifest'] => ({
  description: { es: 'Papel marfil, acuarela y eucalipto.', en: 'Ivory paper, watercolor and eucalyptus.' },
  license: { id: 'commissioned-saas-redistribution', summary: 'Obra por encargo; licencia expresa para redistribuir dentro de Quinvite.', document: 'LICENSES.md' },
  assetsCredits: [
    { path: 'assets/img/wash-a.webp', title: 'Acuarela A', author: 'Estudio Ejemplo', source: 'original', license: 'commissioned', url: null },
    { path: 'assets/fonts/cormorant-400.woff2', title: 'Cormorant Garamond 400', author: 'Christian Thalmann', source: 'https://fonts.google.com/specimen/Cormorant+Garamond', license: 'OFL-1.1', url: 'https://openfontlicense.org' },
  ],
  thirdPartyMarks: marks ? [{ name: 'Café Habana', owner: 'Habana Hospitality LLC', usage: 'Logotipo en el cierre de la invitación, con permiso por escrito archivado.' }] : [],
  slug,
  presets: { salvia: { label: { es: 'Salvia y durazno', en: 'Sage & peach' } }, oliva: { label: { es: 'Oliva y marfil', en: 'Olive & ivory' } }, rosa: { label: { es: 'Eucalipto y rosa palo', en: 'Eucalyptus & blush' } } },
})

let nextId = 4
const packages: Package[] = [
  {
    id: 1, slug: 'botanical', semver: '1.0.0', level: 1, visibility: 'public', tier: 'premium', status: 'active',
    name: { es: 'Botánica acuarela', en: 'Watercolor botanical' }, eventTypes: ['wedding', 'quinceanera'], engineMin: 1,
    author: { name: 'Estudio Ejemplo', url: 'https://example.com' }, sizeBytes: 311220, installedAt: '2026-11-14T16:20:00Z', eventsPinned: 12,
    manifest: manifestOf('botanical', false), files: files(), contentHash: '3f9a1c2e'.repeat(8),
    templates: [
      { id: 11, slug: 'botanical-wedding', versionId: 31, versionStatus: 'published' },
      { id: 12, slug: 'botanical-quinceanera', versionId: 32, versionStatus: 'published' },
    ],
  },
  {
    id: 2, slug: 'classic', semver: '1.0.0', level: 1, visibility: 'public', tier: 'free', status: 'installed',
    name: { es: 'Clásica', en: 'Classic' }, eventTypes: ['quinceanera', 'wedding'], engineMin: 1,
    author: { name: 'Quinvite', url: null }, sizeBytes: 86400, installedAt: '2026-11-15T09:05:00Z', eventsPinned: 0,
    manifest: manifestOf('classic', false), files: files().slice(0, 1), contentHash: '7d1e0b44'.repeat(8),
    templates: [
      { id: 1, slug: 'classic-quinceanera', versionId: 41, versionStatus: 'draft' },
      { id: 2, slug: 'classic-wedding', versionId: 42, versionStatus: 'draft' },
    ],
  },
  {
    id: 3, slug: 'habana-vip', semver: '0.2.0', level: 1, visibility: 'private', tier: 'premium', status: 'deactivated',
    name: { es: 'Noche habanera', en: 'Havana night' }, eventTypes: ['wedding'], engineMin: 1,
    author: { name: 'Estudio Ejemplo', url: null }, sizeBytes: 402100, installedAt: '2026-11-10T13:00:00Z', eventsPinned: 1,
    manifest: manifestOf('habana-vip', true), files: files(), contentHash: '90ab11cd'.repeat(8),
    templates: [{ id: 21, slug: 'habana-vip-wedding', versionId: 51, versionStatus: 'published' }],
  },
]
const toSummary = (p: Package): PackageSummary => ({
  id: p.id, slug: p.slug, semver: p.semver, level: p.level, visibility: p.visibility, tier: p.tier, status: p.status, name: p.name,
  eventTypes: p.eventTypes, engineMin: p.engineMin, author: p.author, sizeBytes: p.sizeBytes, installedAt: p.installedAt, eventsPinned: p.eventsPinned,
})
const find = (id: number) => packages.find(p => p.id === id) ?? fail(404, { message: 'Not found', code: 'package_not_found' })

const grants: Grant[] = [
  { id: 1, packageSlug: 'habana-vip', eventId: 77, userId: null, grantedBy: 1, grantReason: 'Cliente VIP, pago verificado', createdAt: '2026-11-11T10:00:00Z', revokedAt: null, revokedBy: null, revokeReason: null },
]

export async function listPackages(query: PackagesQuery): Promise<PackagePage> {
  await wait()
  let rows = packages
  if (query.status) rows = rows.filter(p => p.status === query.status)
  if (query.visibility) rows = rows.filter(p => p.visibility === query.visibility)
  return { items: rows.map(toSummary), meta: { page: 1, perPage: 25, total: rows.length } }
}

export async function getPackage(id: number): Promise<Package> {
  await wait()
  return clone(find(id))
}

const ERRORS: ReportItem[] = [
  { file: 'theme.css', line: 14, code: 'css_url_external', message: 'url() fuera de assets/', detail: 'https://cdn.example.com/y.png' },
  { file: 'theme.css', line: 31, code: 'css_important', message: 'No se permite !important', detail: '.pkg-title { color: red !important }' },
  { file: 'manifest.json', line: 7, code: 'version_not_greater', message: 'La versión 1.0.0 no es mayor que la instalada', detail: '1.0.0 <= 1.0.0' },
  { file: 'assets/img/torn-edge.svg', line: 3, code: 'svg_forbidden_element', message: 'Elemento <script> no permitido', detail: '<script>' },
  { file: 'sections/rsvp.html', line: 12, code: 'img_alt_missing', message: 'La imagen no tiene texto alternativo', detail: '<img src="assets/img/wash-a.webp">' },
  { file: null, line: null, code: 'license_missing', message: 'Falta LICENSES.md', detail: null },
]
const WARNINGS: ReportItem[] = [
  { file: 'assets/img/wash-a.webp', line: null, code: 'budget_exceeded', message: 'Los assets suman 372 KB; el objetivo es 350 KB', detail: null },
  { file: 'theme.css', line: 88, code: 'css_costly_property', message: 'filter: blur() es costoso en móviles modestos', detail: null },
  { file: 'tokens.json', line: null, code: 'contrast_low', message: 'inkSoft sobre surfaceAlt: 4,1:1 (se pide 4,5:1)', detail: null },
]

export async function validatePackage(file: File, onProgress?: (fraction: number) => void): Promise<ValidateResult> {
  for (const f of [0.2, 0.55, 1]) { onProgress?.(f); await wait(180) }
  const name = file.name.toLowerCase()
  const marks = name.includes('marcas')
  const bad = name.includes('errores')
  const report: ValidationReport = {
    errors: bad ? clone(ERRORS) : [],
    warnings: bad ? clone(WARNINGS) : [
      ...(marks ? [{ file: 'manifest.json', line: null, code: 'third_party_marks_declared', message: 'El paquete declara 1 marca de terceros', detail: 'Café Habana' }] : []),
      ...clone(WARNINGS).slice(0, 2),
    ],
    stats: { files: 31, uncompressedBytes: 1203412, runtimeBytes: 311220, firstFoldBytes: 140100 },
    manifest: { slug: marks ? 'habana-vip' : 'botanical', version: marks ? '0.3.0' : '1.1.0', level: 1, visibility: marks ? 'private' : 'public', tier: 'premium', presets: manifestOf('x', false).presets },
  }
  const valid = !bad
  return { valid, stageToken: valid ? `stg_${file.name.replace(/\W/g, '')}_01HX` : null, expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(), report }
}

export async function discardStage(token: string): Promise<void> {
  await wait(80)
  if (!token) fail(404, { message: 'Not found', code: 'stage_not_found' })
}

export async function installPackage(stageToken: string, reason: string): Promise<Package> {
  await wait(350)
  reasonOk(reason)
  if (stageToken.startsWith('stg_expired')) fail(410, { message: 'Gone', code: 'stage_expired' })
  const marks = stageToken.includes('marcas')
  const slug = marks ? 'habana-vip' : 'botanical'
  const pkg: Package = {
    id: nextId++, slug, semver: marks ? '0.3.0' : '1.1.0', level: 1, visibility: marks ? 'private' : 'public', tier: 'premium', status: 'installed',
    name: marks ? { es: 'Noche habanera', en: 'Havana night' } : { es: 'Botánica acuarela', en: 'Watercolor botanical' },
    eventTypes: marks ? ['wedding'] : ['wedding', 'quinceanera'], engineMin: 1, author: { name: 'Estudio Ejemplo', url: null },
    sizeBytes: 311220, installedAt: new Date().toISOString(), eventsPinned: 0, manifest: manifestOf(slug, marks), files: files(),
    contentHash: 'e4c1a9f0'.repeat(8),
    templates: [{ id: 90 + nextId, slug: `${slug}-wedding`, versionId: 100 + nextId, versionStatus: 'draft' }],
  }
  packages.unshift(pkg)
  return clone(pkg)
}

export async function getImpact(id: number, action: 'deactivate' | 'withdraw'): Promise<Impact> {
  await wait(150)
  const p = find(id)
  return { eventsPinned: p.eventsPinned, eventsUnpublished: action === 'deactivate' ? (p.slug === 'botanical' ? 5 : 0) : 0, templates: p.templates.map(t => ({ id: t.id, slug: t.slug })) }
}

export async function activatePackage(id: number, reason: string, ack?: boolean): Promise<ActivateResult> {
  await wait(300)
  reasonOk(reason)
  const p = find(id)
  if (p.status === 'active' || p.status === 'withdrawn') fail(409, { message: 'State', code: 'package_not_installable' })
  if ((p.manifest.thirdPartyMarks ?? []).length > 0 && !ack) fail(422, { message: 'Invalid', errors: { ack_third_party_marks: ['required'] } })
  p.status = 'active'
  p.templates.forEach(t => { t.versionStatus = 'published' })
  return { package: clone(p), eventsOnPreviousVersion: p.slug === 'classic' ? 17 : 0 }
}

export async function deactivatePackage(id: number, reason: string): Promise<Package> {
  await wait(300)
  reasonOk(reason)
  const p = find(id)
  if (p.status !== 'active') fail(409, { message: 'State', code: 'package_not_active' })
  p.status = 'deactivated'
  return clone(p)
}

export async function withdrawPackage(id: number, reason: string): Promise<void> {
  await wait(300)
  reasonOk(reason)
  const p = find(id)
  if (p.eventsPinned > 0) fail(409, { message: 'In use', code: 'package_in_use', eventsPinned: p.eventsPinned })
  p.status = 'withdrawn'
}

export async function listGrants(id: number): Promise<Grant[]> {
  await wait()
  const p = find(id)
  if (p.visibility !== 'private') fail(409, { message: 'Not private', code: 'package_not_private' })
  return clone(grants.filter(g => g.packageSlug === p.slug))
}

export async function createGrant(id: number, target: { eventId?: number; userId?: number }, reason: string): Promise<Grant> {
  await wait(250)
  reasonOk(reason)
  const p = find(id)
  if (p.visibility !== 'private') fail(409, { message: 'Not private', code: 'package_not_private' })
  if (!target.eventId && !target.userId) fail(422, { message: 'Invalid', errors: { event_id: ['required_one'] } })
  const g: Grant = { id: grants.length + 1, packageSlug: p.slug, eventId: target.eventId ?? null, userId: target.userId ?? null, grantedBy: 1, grantReason: reason, createdAt: new Date().toISOString(), revokedAt: null, revokedBy: null, revokeReason: null }
  grants.push(g)
  return clone(g)
}

export async function revokeGrant(id: number, grantId: number, reason: string): Promise<Grant> {
  await wait(250)
  reasonOk(reason)
  const g = grants.find(x => x.id === grantId && x.packageSlug === find(id).slug) ?? fail(404, { message: 'Not found', code: 'grant_not_found' })
  if (g.revokedAt) fail(409, { message: 'Revoked', code: 'grant_revoked' })
  g.revokedAt = new Date().toISOString()
  g.revokeReason = reason
  return clone(g)
}

const PRESETS: Record<string, Record<string, string>> = {
  salvia: { surface: '#fbf8f1', surfaceAlt: '#f1efe3', ink: '#34382c', inkSoft: '#555a47', accent: '#8c8658', primary: '#566f52' },
  oliva: { surface: '#faf7ef', surfaceAlt: '#eeebd9', ink: '#2e3125', inkSoft: '#4d5240', accent: '#7a7448', primary: '#6b7a3d' },
  rosa: { surface: '#fcf6f3', surfaceAlt: '#f6e7e1', ink: '#3a2f2c', inkSoft: '#5f4d48', accent: '#a98563', primary: '#b4636f' },
}
export const MOCK_PRESETS = Object.keys(PRESETS)

/** Resolved payload for the simulated preview page (src/modules/templates/dev/mock-preview.html). */
export async function previewPackage(body: PackagePreviewBody): Promise<unknown> {
  await wait(120)
  if (!body.stage_token && !body.package_id) fail(404, { message: 'Not found', code: 'stage_not_found' })
  const noPhoto = body.state === 'no_photo' || body.state === 'save_the_date'
  const es = body.locale === 'es'
  const sections = body.state === 'save_the_date'
    ? [{ type: 'cover', title: es ? 'Guarda la fecha' : 'Save the date', text: es ? 'Pronto te enviaremos la invitación.' : 'The invitation is coming soon.' }]
    : [
        { type: 'cover', title: es ? 'Te invitamos a celebrar' : 'Join us to celebrate', text: noPhoto ? null : (es ? 'Queremos compartir este día contigo.' : 'We want to share this day with you.') },
        { type: 'itinerary', title: es ? 'Programa del día' : 'Program of the day', text: null },
        { type: 'rsvp', title: es ? '¿Nos acompañas?' : 'Will you join us?', text: es ? 'Confirma tu asistencia.' : 'Let us know if you can make it.' },
      ]
  return {
    locale: body.locale, eventType: body.eventType,
    theme: { colors: PRESETS[body.preset ?? 'salvia'] ?? PRESETS.salvia, fonts: { heading: 'Cormorant Garamond', body: 'Cormorant Garamond', script: 'Great Vibes' } },
    sections,
  }
}
