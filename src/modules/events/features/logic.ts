/** Pure helpers of the Funciones tab: types, labels and the expiry options. */

export type ModuleState = 'active' | 'locked'
export type ModuleSource = 'plan' | 'gift' | 'blocked'
export type ExpiryChoice = 'none' | '7' | '30' | '90' | 'date'

export interface ModuleOverride {
  state: ModuleState
  reason: string
  expiresAt: string | null
  createdAt: string | null
  createdBy: { id: number; name: string | null } | null
}

export interface EventModuleRow {
  key: string
  section: string
  order: number
  baseState: ModuleState
  effectiveState: ModuleState
  source: ModuleSource
  override: ModuleOverride | null
}

export interface EventModulesData { giftsActive: number; blockedActive: number; modules: EventModuleRow[] }

export const SECTION_LABEL: Record<string, string> = {
  main: 'Principal', guests: 'Invitados', organization: 'Organización', extras: 'Extras',
}
export const SECTION_ORDER = ['main', 'guests', 'organization', 'extras']
export const sectionLabel = (section: string) => SECTION_LABEL[section] ?? section

export const SOURCE_LABEL: Record<ModuleSource, string> = {
  plan: 'Según el plan', gift: 'Regalado', blocked: 'Bloqueado a mano',
}

export const EXPIRY_OPTIONS: { value: ExpiryChoice; title: string }[] = [
  { value: 'none', title: 'Sin vencimiento' },
  { value: '7', title: '7 días' },
  { value: '30', title: '30 días' },
  { value: '90', title: '90 días' },
  { value: 'date', title: 'Otra fecha' },
]

/** `YYYY-MM-DD` in the local calendar. */
export const toDateInput = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** The expiry to send (ISO, end of the day for a picked date) or null for none; `undefined` when the choice is incomplete or in the past. */
export function expiryFor(choice: ExpiryChoice, date: string, now: Date = new Date()): string | null | undefined {
  if (choice === 'none') return null
  if (choice === 'date') {
    if (!date) return undefined
    const end = new Date(`${date}T23:59:59`)
    return Number.isNaN(end.getTime()) || end <= now ? undefined : end.toISOString()
  }
  return new Date(now.getTime() + Number(choice) * 86_400_000).toISOString()
}

/** Groups rows by section in menu order, keeping each row's own order. */
export function groupBySection(rows: EventModuleRow[]): { section: string; rows: EventModuleRow[] }[] {
  const bySection = new Map<string, EventModuleRow[]>()
  for (const r of rows) bySection.set(r.section, [...(bySection.get(r.section) ?? []), r])
  const known = SECTION_ORDER.filter(s => bySection.has(s))
  const extra = [...bySection.keys()].filter(s => !SECTION_ORDER.includes(s))
  return [...known, ...extra].map(section => ({ section, rows: [...bySection.get(section)!].sort((a, b) => a.order - b.order) }))
}

/** "Vence el 20 nov 2026" / "Sin vencimiento" / "" when there is no exception. */
export function expiryLabel(o: ModuleOverride | null, locale = 'es-US'): string {
  if (!o) return ''
  if (!o.expiresAt) return 'Sin vencimiento'
  return `Vence el ${new Date(o.expiresAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
}
