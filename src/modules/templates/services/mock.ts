import type {
  DraftBody, PreviewBody, PublishResult, Section, TemplateDetail, TemplateSummary, TemplateVersion, Theme, VersionRow,
} from '../types'
import { FONTS_SCRIPT, FONTS_TEXT, isHex } from '../logic'

/**
 * In-memory stand-in for the templates API, used only with VITE_TEMPLATES_MOCK=true. It answers with the contract's shapes
 * and error responses (409 draft_exists, 409 version_immutable, 422 by field, 422 on archiving the only published one).
 */

const wait = (ms = 220) => new Promise(r => setTimeout(r, ms))
const fail = (status: number, data: Record<string, unknown>): never => { throw { response: { status, data } } }
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))

const base = { surface: '#fbf7f2', surfaceAlt: '#f4ede4', ink: '#2b2420', inkSoft: '#5b524c', accent: '#c9a24e' }
const theme = (): Theme => ({
  theme: 'classic',
  fonts: { heading: 'Fraunces', body: 'Figtree', script: 'Pinyon Script' },
  preset: 'rose',
  presets: {
    rose: { label: { es: 'Rosa', en: 'Rose' }, colors: { ...base, primary: '#b04a62' } },
    sage: { label: { es: 'Salvia', en: 'Sage' }, colors: { ...base, primary: '#5f7a5b' } },
    navy: { label: { es: 'Azul noche', en: 'Midnight' }, colors: { ...base, primary: '#2f4a6d' } },
  },
})

const sec = (type: string, order: number, es: [string, string | null], en: [string, string | null]): Section => ({
  type, enabled: true, order, title: { es: es[0], en: en[0] }, text: { es: es[1], en: en[1] }, settings: type === 'cover' ? { image: null } : {},
})
const quinceSections = (): Section[] => [
  sec('cover', 1, ['Te invito a celebrar', 'Quiero compartir este día tan especial contigo.'], ['Join me to celebrate', 'I want to share this special day with you.']),
  sec('itinerary', 2, ['Programa del día', null], ['Program of the day', null]),
  sec('locations', 3, ['Dónde celebramos', null], ['Where we celebrate', null]),
  sec('dress_code', 4, ['Código de vestimenta', null], ['Dress code', null]),
  sec('padrinos', 5, ['Con el cariño de', null], ['With love from', null]),
  sec('rsvp', 6, ['¿Me acompañas?', 'Confirma tu asistencia para que todo salga perfecto.'], ['Will you join me?', 'Let me know if you can make it so everything is perfect.']),
  sec('closing', 7, ['Gracias por ser parte de mi día', 'Te espero con mucho cariño.'], ['Thank you for being part of my day', 'I can’t wait to see you.']),
]
const weddingSections = (): Section[] => {
  const s = quinceSections()
  s[0] = sec('cover', 1, ['Te invitamos a celebrar', 'Queremos compartir este día tan especial contigo.'], ['Join us to celebrate', 'We want to share this special day with you.'])
  s[5] = sec('rsvp', 6, ['¿Nos acompañas?', 'Confirma tu asistencia para que todo salga perfecto.'], ['Will you join us?', 'Let us know if you can make it so everything is perfect.'])
  s[6] = sec('closing', 7, ['Gracias por acompañarnos', 'Los esperamos con mucho cariño.'], ['Thank you for celebrating with us', 'We can’t wait to see you.'])
  return s
}

interface Row extends TemplateVersion { eventsCount: number }
interface Tpl { id: number; slug: string; name: string; eventTypeId: number; tier: string; isActive: boolean; currentVersionId: number | null }

const tpls: Tpl[] = [
  { id: 1, slug: 'classic-quinceanera', name: 'Clásica · Quinceañera', eventTypeId: 1, tier: 'free', isActive: true, currentVersionId: 2 },
  { id: 2, slug: 'classic-wedding', name: 'Clásica · Boda', eventTypeId: 2, tier: 'free', isActive: true, currentVersionId: 4 },
]
const v = (id: number, templateId: number, version: number, status: TemplateVersion['status'], eventsCount: number, notes: string | null, sections: Section[], createdAt: string, publishedAt: string | null): Row => ({
  id, templateId, version, status, schemaVersion: 1, sections, theme: theme(), notes, createdAt, publishedAt, eventsCount,
})
const versions: Row[] = [
  v(1, 1, 1, 'archived', 3, 'Versión inicial.', quinceSections(), '2026-10-02T15:00:00Z', '2026-10-02T15:30:00Z'),
  v(2, 1, 2, 'published', 17, 'Textos de la portada más cálidos.', quinceSections(), '2026-11-04T15:00:00Z', '2026-11-05T12:00:00Z'),
  v(3, 1, 3, 'draft', 0, 'Probando paleta salvia.', quinceSections(), '2026-11-12T18:20:00Z', null),
  v(4, 2, 1, 'published', 6, null, weddingSections(), '2026-10-02T15:00:00Z', '2026-10-02T15:30:00Z'),
]
let nextId = 5

const summary = (t: Tpl): TemplateSummary => {
  const cur = versions.find(x => x.id === t.currentVersionId)
  const draft = versions.find(x => x.templateId === t.id && x.status === 'draft')
  return {
    id: t.id, slug: t.slug, name: t.name, eventTypeId: t.eventTypeId, tier: t.tier, isActive: t.isActive,
    currentVersion: cur ? { id: cur.id, version: cur.version, publishedAt: cur.publishedAt ?? null } : null,
    draftVersionId: draft?.id ?? null,
    eventsCount: versions.filter(x => x.templateId === t.id).reduce((n, x) => n + x.eventsCount, 0),
  }
}
const publicVersion = (r: Row): TemplateVersion => { const rest: Partial<Row> = clone(r); delete rest.eventsCount; return rest as TemplateVersion }
const find = (id: number): Row => versions.find(x => x.id === id) ?? fail(404, { message: 'Not found' })

export async function listTemplates(): Promise<TemplateSummary[]> { await wait(); return tpls.map(summary) }

export async function getTemplate(id: number): Promise<TemplateDetail> {
  await wait()
  const t = tpls.find(x => x.id === id) ?? fail(404, { message: 'Not found' })
  const rows: VersionRow[] = versions.filter(x => x.templateId === id).sort((a, b) => b.version - a.version)
    .map(x => ({ id: x.id, version: x.version, status: x.status, notes: x.notes, createdAt: x.createdAt ?? null, publishedAt: x.publishedAt ?? null, eventsCount: x.eventsCount }))
  return { ...summary(t), versions: rows }
}

export async function getVersion(id: number): Promise<TemplateVersion> { await wait(); return publicVersion(find(id)) }

export async function createDraft(templateId: number): Promise<TemplateVersion> {
  await wait()
  const t = tpls.find(x => x.id === templateId) ?? fail(404, { message: 'Not found' })
  const existing = versions.find(x => x.templateId === templateId && x.status === 'draft')
  if (existing) fail(409, { code: 'draft_exists', message: 'Draft exists', draftVersionId: existing.id })
  const cur = find(t.currentVersionId ?? 0)
  const row: Row = {
    ...clone(cur), id: nextId++, version: Math.max(...versions.filter(x => x.templateId === templateId).map(x => x.version)) + 1,
    status: 'draft', notes: null, createdAt: new Date().toISOString(), publishedAt: null, eventsCount: 0,
  }
  versions.push(row)
  return publicVersion(row)
}

function validate(body: DraftBody): Record<string, string[]> {
  const errors: Record<string, string[]> = {}
  body.sections.forEach((s, i) => {
    for (const f of ['title', 'text'] as const) for (const l of ['es', 'en'] as const) {
      if ((s[f][l] ?? '').length > 1000) errors[`sections.${i}.${f}.${l}`] = ['El texto no puede superar 1000 caracteres.']
    }
    if ((s.type === 'cover' || s.type === 'rsvp') && !s.enabled) errors[`sections.${i}.enabled`] = ['Esta sección es obligatoria.']
  })
  const { fonts, presets } = body.theme
  if (!FONTS_TEXT.includes(fonts.heading)) errors['theme.fonts.heading'] = ['La tipografía no está permitida.']
  if (!FONTS_TEXT.includes(fonts.body)) errors['theme.fonts.body'] = ['La tipografía no está permitida.']
  if (!FONTS_SCRIPT.includes(fonts.script)) errors['theme.fonts.script'] = ['La tipografía no está permitida.']
  for (const [id, p] of Object.entries(presets)) for (const [k, c] of Object.entries(p.colors)) {
    if (!isHex(c)) errors[`theme.presets.${id}.colors.${k}`] = ['Debe ser un color hex válido.']
  }
  return errors
}

export async function saveDraft(id: number, body: DraftBody): Promise<TemplateVersion> {
  await wait()
  const row = find(id)
  if (row.status !== 'draft') fail(409, { code: 'version_immutable', message: 'Immutable' })
  const errors = validate(body)
  if (Object.keys(errors).length) fail(422, { message: 'Invalid', errors })
  row.sections = clone(body.sections)
  row.theme = clone(body.theme)
  row.notes = body.notes
  return publicVersion(row)
}

export async function publishVersion(id: number, reason: string): Promise<PublishResult> {
  await wait()
  if (reason.trim().length < 5) fail(422, { message: 'Invalid', errors: { reason: ['Mínimo 5 caracteres.'] } })
  const row = find(id)
  if (row.status !== 'draft') fail(409, { code: 'version_immutable', message: 'Immutable' })
  const previous = versions.find(x => x.templateId === row.templateId && x.status === 'published')
  const events = previous?.eventsCount ?? 0
  if (previous) previous.status = 'archived'
  row.status = 'published'
  row.publishedAt = new Date().toISOString()
  const t = tpls.find(x => x.id === row.templateId)
  if (t) t.currentVersionId = row.id
  return { version: publicVersion(row), eventsOnPreviousVersion: events }
}

export async function archiveVersion(id: number, reason: string): Promise<void> {
  await wait()
  if (reason.trim().length < 5) fail(422, { message: 'Invalid', errors: { reason: ['Mínimo 5 caracteres.'] } })
  const row = find(id)
  if (row.status === 'published') fail(422, { message: 'No se puede archivar la única versión publicada.' })
  if (row.status !== 'draft') fail(409, { code: 'version_immutable', message: 'Immutable' })
  row.status = 'archived'
}

/** Resolved payload for the simulated preview page (src/modules/templates/dev/mock-preview.html). */
export async function previewPayload(body: PreviewBody): Promise<unknown> {
  await wait(120)
  const errors = validate({ sections: body.sections, theme: body.theme, notes: null })
  if (Object.keys(errors).length) fail(422, { message: 'Invalid', errors })
  const colors = body.theme.presets[body.theme.preset]?.colors ?? Object.values(body.theme.presets)[0]?.colors
  return clone({
    locale: body.locale,
    eventType: body.eventType,
    theme: { colors, fonts: body.theme.fonts },
    sections: body.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order).map(s => ({ type: s.type, title: s.title[body.locale], text: s.text[body.locale] })),
  })
}
