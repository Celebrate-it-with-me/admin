import type { Catalog, CatalogModule, CatalogPlan, Impact, PlanChanges, PendingChange, PlansUpdateResult, ToggleResult } from './types'

/** Pure helpers of Módulos y planes: labels, grouping, the plan list a change produces and the confirmation rules. */

export const MODULE_LABEL: Record<string, string> = {
  timeline: 'Cronograma', guests: 'Invitados', invitation: 'Invitación', menus: 'Menús', locations: 'Lugares',
  rsvp: 'Confirmaciones', seating: 'Mesas', dress_code: 'Código de vestimenta', suggested_music: 'Música sugerida',
  save_the_date: 'Save the date', budget: 'Presupuesto', memories: 'Recuerdos', comments: 'Comentarios', padrinos: 'Padrinos',
}
/** A module the team has not named yet shows its key, so nothing is hidden. */
export const moduleLabel = (key: string) => MODULE_LABEL[key] ?? key

export const SECTION_LABEL: Record<string, string> = { main: 'Principal', guests: 'Invitados', organization: 'Organización', extras: 'Extras' }
export const SECTION_ORDER = ['main', 'guests', 'organization', 'extras']
export const sectionLabel = (section: string) => SECTION_LABEL[section] ?? section

/** More affected events than this asks for a typed confirmation. */
export const TYPED_CONFIRM_THRESHOLD = 25

/** Groups modules by section in menu order, each section sorted by its own order. */
export function groupBySection(modules: CatalogModule[]): { section: string; rows: CatalogModule[] }[] {
  const bySection = new Map<string, CatalogModule[]>()
  for (const m of modules) bySection.set(m.section, [...(bySection.get(m.section) ?? []), m])
  const known = SECTION_ORDER.filter(s => bySection.has(s))
  const extra = [...bySection.keys()].filter(s => !SECTION_ORDER.includes(s))
  return [...known, ...extra].map(section => ({ section, rows: [...bySection.get(section)!].sort((a, b) => a.order - b.order) }))
}

/** Guest limit of a plan: null when it has none (the API sends 0 or null). */
export const guestLimit = (plan: Pick<CatalogPlan, 'maxGuests'>): number | null => (plan.maxGuests && plan.maxGuests > 0 ? plan.maxGuests : null)

export const limitLabel = (plan: Pick<CatalogPlan, 'maxGuests'>) => {
  const limit = guestLimit(plan)
  return limit == null ? 'Sin límite de invitados' : `Hasta ${limit} invitados`
}

/** Lux has no price and no limit: it is arranged by hand, not sold from the app. */
export const isNotForSale = (plan: CatalogPlan) => !plan.isFullPlan && !plan.priceCents && guestLimit(plan) == null

export const priceLabel = (plan: CatalogPlan) => {
  if (isNotForSale(plan)) return 'No a la venta'
  if (!plan.priceCents) return 'Gratis'
  return `$${(plan.priceCents / 100).toFixed(plan.priceCents % 100 ? 2 : 0)}`
}

export const eventsLabel = (n: number) => (n === 1 ? '1 evento' : `${n} eventos`)

/** Plans a module has after turning one plan on or off. Keeps the order of the plan list. */
export function planSlugsAfter(current: string[], plans: CatalogPlan[], slug: string, on: boolean): string[] {
  const set = new Set(current)
  if (on) set.add(slug); else set.delete(slug)
  return plans.map(p => p.slug).filter(s => set.has(s))
}

/** The free tier: no price and a guest limit. Lux has no limit, so it is a "tailor-made" tier, not the free one. */
export const isFreePlan = (plan: CatalogPlan) => !plan.isFullPlan && !plan.priceCents && guestLimit(plan) != null

/** True when the module goes from paid-only to also being in a free plan. */
export function movesToFree(current: string[], next: string[], plans: CatalogPlan[]): boolean {
  const free = new Set(plans.filter(isFreePlan).map(p => p.slug))
  return !current.some(s => free.has(s)) && next.some(s => free.has(s))
}

/** Whether the change asks to type the module name. Turning the module on or off never does. */
export function needsTypedConfirm(change: PendingChange, plans: CatalogPlan[], impact: Impact | null, keepForExisting: boolean): boolean {
  if (change.kind !== 'plans') return false
  if (movesToFree(change.module.planSlugs, change.planSlugs, plans)) return true
  return Boolean(impact && !keepForExisting && impact.totalToLocked > TYPED_CONFIRM_THRESHOLD)
}

/** The typed text matches the module key or its Spanish name, ignoring case and outer spaces. */
export function confirmMatches(typed: string, key: string): boolean {
  const t = typed.trim().toLowerCase()
  return t !== '' && (t === key.toLowerCase() || t === moduleLabel(key).toLowerCase())
}

export const removedSlugs = (change: PendingChange): string[] =>
  change.kind === 'plans' ? change.module.planSlugs.filter(s => !change.planSlugs.includes(s)) : []

export const exceptionsTotal = (modules: CatalogModule[]) =>
  modules.reduce((n, m) => n + m.overrides.active + m.overrides.locked, 0)

/** Sentence shown after a successful save. */
export function plansResultText(key: string, r: PlansUpdateResult): string {
  const parts = [`${moduleLabel(key)}: planes actualizados.`]
  if (r.overridesCreated > 0) parts.push(`Se crearon ${r.overridesCreated} excepciones para que los eventos actuales lo conserven.`)
  if (r.eventsLocked > 0) parts.push(`${r.eventsLocked} eventos perdieron el módulo.`)
  if (r.overridesCreated === 0 && r.eventsLocked === 0) parts.push('No cambió el acceso de ningún evento actual.')
  return parts.join(' ')
}

export function toggleResultText(key: string, enabled: boolean, r: ToggleResult): string {
  if (enabled) return `${moduleLabel(key)}: encendido para todos.`
  const orphans = r.orphanOverrides > 0 ? ` Hay ${r.orphanOverrides} excepciones activas que no tendrán efecto mientras esté apagado.` : ''
  return `${moduleLabel(key)}: apagado para todos.${orphans}`
}

export const MAX_GUESTS_LIMIT = 100000

/** Guest limit typed in the plan form: a whole number from 1 to 100000, or an error sentence. */
export function parseGuestLimit(text: string): { value: number } | { error: string } {
  const t = text.trim()
  if (!/^\d+$/.test(t)) return { error: 'Escribe un número entero, por ejemplo 150.' }
  const n = Number(t)
  if (n < 1 || n > MAX_GUESTS_LIMIT) return { error: `El límite va de 1 a ${MAX_GUESTS_LIMIT.toLocaleString('es')}. Para quitarlo, marca «Ilimitado».` }
  return { value: n }
}

/** What the plan form changes compared with the plan as it is: only the fields that differ (limit 0 = unlimited). */
export function planChanges(plan: CatalogPlan, next: { maxGuests: number; name: string; description: string }): PlanChanges {
  const out: PlanChanges = {}
  if (next.maxGuests !== (plan.maxGuests ?? 0)) out.maxGuests = next.maxGuests
  if (next.name.trim() !== plan.name) out.name = next.name.trim()
  const desc = next.description.trim() === '' ? null : next.description.trim()
  if (desc !== (plan.description?.trim() || null)) out.description = desc
  return out
}

/** Sentence for the impact of a new guest limit. Nobody is blocked: events above it just cannot add or publish. */
export function planImpactText(over: number, nowOver: number): string {
  const now = nowOver > 0 ? ` Hoy ${nowOver === 1 ? 'hay 1 evento' : `hay ${nowOver} eventos`} por encima del límite actual.` : ''
  if (over === 0) return `Ningún evento quedará por encima del nuevo límite.${now}`
  const who = over === 1 ? '1 evento quedará' : `${over} eventos quedarán`
  return `${who} por encima del nuevo límite; no se bloquea a nadie, solo se impide agregar o publicar.${now}`
}

export function planResultText(name: string, over: number): string {
  return over > 0
    ? `${name}: plan actualizado. ${over === 1 ? '1 evento está' : `${over} eventos están`} por encima del límite.`
    : `${name}: plan actualizado.`
}

const ERROR_BY_CODE: Record<string, string> = {
  module_in_sold_plan: 'El plan de pago incluye todo: este módulo no se puede quitar de él.',
}

/** Turns a failed request into a sentence for the team. */
export function explainError(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { code?: string; message?: string; errors?: Record<string, string[]> } } }
  if (!err?.response) return 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.'
  const { status, data } = err.response
  if (data?.code && ERROR_BY_CODE[data.code]) return ERROR_BY_CODE[data.code]
  if (status === 403) return 'Solo un superadmin puede cambiar el catálogo.'
  if (data?.errors?.reason) return 'Escribe un motivo de al menos 5 caracteres.'
  if (status === 422) return Object.values(data?.errors ?? {})[0]?.[0] ?? data?.message ?? 'Los datos no son válidos.'
  return 'No pudimos hacerlo. Inténtalo de nuevo.'
}

/** Plans of the catalog as the events module needs them (change-plan dialog). */
export function planOptions(catalog: Catalog): { slug: string; name: string; limit: number | null }[] {
  return catalog.plans.map(p => ({ slug: p.slug, name: p.name, limit: guestLimit(p) }))
}
