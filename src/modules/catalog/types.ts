/** Shapes of the admin catalog API (GET admin/catalog, admin/catalog/impact and the two writes). */

export interface CatalogModule {
  key: string
  section: string
  order: number
  isEnabled: boolean
  planSlugs: string[]
  eventsByPlan: Record<string, number>
  /** Current exceptions for this module: gifted (`active`) and blocked by hand (`locked`). */
  overrides: { active: number; locked: number }
}

export interface CatalogPlan {
  slug: string
  name: string
  /** 0 or null means no limit. */
  maxGuests: number | null
  priceCents: number | null
  isFullPlan: boolean
  eventsCount: number
}

export interface Catalog { modules: CatalogModule[]; plans: CatalogPlan[] }

export interface ImpactPlanRow {
  slug: string
  name: string
  change: 'added' | 'removed'
  events: number
  withOverride: number
  toLocked: number
  toActive: number
}

export interface Impact {
  module: string
  isEnabled: boolean
  currentPlanSlugs: string[]
  planSlugs: string[]
  removesFromFullPlan: boolean
  plans: ImpactPlanRow[]
  totalToLocked: number
  totalToActive: number
}

export interface PlansUpdateResult { module: CatalogModule; overridesCreated: number; eventsLocked: number }
export interface ToggleResult { module: CatalogModule; orphanOverrides: number }

/** What the person is about to change; the dialog turns it into an impact check and a save. */
export type PendingChange =
  | { kind: 'plans'; module: CatalogModule; planSlugs: string[] }
  | { kind: 'toggle'; module: CatalogModule; isEnabled: boolean }

export interface SaveOutcome { text: string }
