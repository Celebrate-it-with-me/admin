import { describe, expect, it } from 'vitest'
import {
  TYPED_CONFIRM_THRESHOLD, confirmMatches, eventsLabel, exceptionsTotal, explainError, groupBySection, guestLimit, isFreePlan,
  limitLabel, moduleLabel, movesToFree, needsTypedConfirm, planOptions, planSlugsAfter, plansResultText, removedSlugs,
  sectionLabel, toggleResultText,
} from './logic'
import type { Catalog, CatalogModule, CatalogPlan, Impact, PendingChange } from './types'

const plan = (over: Partial<CatalogPlan> = {}): CatalogPlan => ({
  slug: 'basic', name: 'Gratis', maxGuests: 50, priceCents: 0, isFullPlan: false, eventsCount: 0, ...over,
})
const mod = (over: Partial<CatalogModule> = {}): CatalogModule => ({
  key: 'guests', section: 'guests', order: 1, isEnabled: true, planSlugs: ['premium'], eventsByPlan: {}, overrides: { active: 0, locked: 0 }, ...over,
})
const impact = (over: Partial<Impact> = {}): Impact => ({
  module: 'guests', isEnabled: true, currentPlanSlugs: [], planSlugs: [], removesFromFullPlan: false, plans: [], totalToLocked: 0, totalToActive: 0, ...over,
})

const FREE = plan()
const PAID = plan({ slug: 'premium', name: 'Completo', maxGuests: null, priceCents: 9900, isFullPlan: true })
const LUX = plan({ slug: 'lux', name: 'Lux', maxGuests: null, priceCents: 0, isFullPlan: false })
const PLANS = [FREE, PAID, LUX]

describe('labels', () => {
  it('names known modules and falls back to the key', () => {
    expect(moduleLabel('rsvp')).toBe('Confirmaciones')
    expect(moduleLabel('brand_new')).toBe('brand_new')
  })
  it('names sections with a fallback', () => {
    expect(sectionLabel('organization')).toBe('Organización')
    expect(sectionLabel('misc')).toBe('misc')
  })
  it('pluralises events', () => {
    expect(eventsLabel(1)).toBe('1 evento')
    expect(eventsLabel(0)).toBe('0 eventos')
    expect(eventsLabel(12)).toBe('12 eventos')
  })
})

describe('guest limits', () => {
  it('treats 0 and null as no limit', () => {
    expect(guestLimit({ maxGuests: 0 })).toBeNull()
    expect(guestLimit({ maxGuests: null })).toBeNull()
    expect(guestLimit({ maxGuests: 75 })).toBe(75)
  })
  it('words the limit', () => {
    expect(limitLabel({ maxGuests: 50 })).toBe('Hasta 50 invitados')
    expect(limitLabel({ maxGuests: null })).toBe('Sin límite de invitados')
  })
})

describe('groupBySection', () => {
  it('orders sections as in the menu, unknown ones last, rows by their order', () => {
    const groups = groupBySection([
      mod({ key: 'b', section: 'extras', order: 2 }),
      mod({ key: 'a', section: 'extras', order: 1 }),
      mod({ key: 'z', section: 'weird', order: 1 }),
      mod({ key: 'm', section: 'main', order: 1 }),
    ])
    expect(groups.map(g => g.section)).toEqual(['main', 'extras', 'weird'])
    expect(groups[1].rows.map(r => r.key)).toEqual(['a', 'b'])
  })
  it('does not mutate the input', () => {
    const input = [mod({ key: 'b', order: 2 }), mod({ key: 'a', order: 1 })]
    groupBySection(input)
    expect(input.map(m => m.key)).toEqual(['b', 'a'])
  })
  it('returns nothing for no modules', () => {
    expect(groupBySection([])).toEqual([])
  })
})

describe('planSlugsAfter', () => {
  it('adds a plan keeping the order of the plan list', () => {
    expect(planSlugsAfter(['premium'], PLANS, 'basic', true)).toEqual(['basic', 'premium'])
  })
  it('removes a plan', () => {
    expect(planSlugsAfter(['basic', 'premium'], PLANS, 'basic', false)).toEqual(['premium'])
  })
  it('drops slugs that are not in the plan list', () => {
    expect(planSlugsAfter(['gone', 'premium'], PLANS, 'lux', true)).toEqual(['premium', 'lux'])
  })
})

describe('free plan decisions', () => {
  it('only the unpriced, limited, non-full plan is free', () => {
    expect(isFreePlan(FREE)).toBe(true)
    expect(isFreePlan(PAID)).toBe(false)
    expect(isFreePlan(LUX)).toBe(false) // no guest limit: tailor-made, not free
    expect(isFreePlan(plan({ priceCents: 500 }))).toBe(false)
    expect(isFreePlan(plan({ isFullPlan: true }))).toBe(false)
  })
  it('movesToFree is true only when a module goes from paid-only to also free', () => {
    expect(movesToFree(['premium'], ['basic', 'premium'], PLANS)).toBe(true)
    expect(movesToFree(['basic'], ['basic', 'premium'], PLANS)).toBe(false) // already free
    expect(movesToFree(['premium'], ['premium', 'lux'], PLANS)).toBe(false)
    expect(movesToFree(['basic'], ['premium'], PLANS)).toBe(false) // leaving free
  })
})

describe('needsTypedConfirm', () => {
  const plansChange = (from: string[], to: string[]): PendingChange => ({ kind: 'plans', module: mod({ planSlugs: from }), planSlugs: to })

  it('never asks for a toggle', () => {
    const change: PendingChange = { kind: 'toggle', module: mod(), isEnabled: false }
    expect(needsTypedConfirm(change, PLANS, impact({ totalToLocked: 999 }), false)).toBe(false)
  })
  it('asks when the module reaches the free plan', () => {
    expect(needsTypedConfirm(plansChange(['premium'], ['basic', 'premium']), PLANS, null, false)).toBe(true)
  })
  it('asks above the threshold of locked events', () => {
    const change = plansChange(['basic', 'premium'], ['premium'])
    expect(needsTypedConfirm(change, PLANS, impact({ totalToLocked: TYPED_CONFIRM_THRESHOLD + 1 }), false)).toBe(true)
  })
  it('does not ask at exactly the threshold', () => {
    const change = plansChange(['basic', 'premium'], ['premium'])
    expect(needsTypedConfirm(change, PLANS, impact({ totalToLocked: TYPED_CONFIRM_THRESHOLD }), false)).toBe(false)
  })
  it('does not ask when existing events keep the module', () => {
    const change = plansChange(['basic', 'premium'], ['premium'])
    expect(needsTypedConfirm(change, PLANS, impact({ totalToLocked: 500 }), true)).toBe(false)
  })
  it('does not ask without an impact check yet', () => {
    expect(needsTypedConfirm(plansChange(['basic', 'premium'], ['premium']), PLANS, null, false)).toBe(false)
  })
})

describe('confirmMatches', () => {
  it('accepts the key or the Spanish name, ignoring case and outer spaces', () => {
    expect(confirmMatches('  RSVP ', 'rsvp')).toBe(true)
    expect(confirmMatches('confirmaciones', 'rsvp')).toBe(true)
  })
  it('rejects empty and different text', () => {
    expect(confirmMatches('', 'rsvp')).toBe(false)
    expect(confirmMatches('   ', 'rsvp')).toBe(false)
    expect(confirmMatches('mesas', 'rsvp')).toBe(false)
  })
})

describe('removedSlugs and exceptionsTotal', () => {
  it('lists plans taken away by a plans change only', () => {
    expect(removedSlugs({ kind: 'plans', module: mod({ planSlugs: ['basic', 'premium'] }), planSlugs: ['premium'] })).toEqual(['basic'])
    expect(removedSlugs({ kind: 'toggle', module: mod(), isEnabled: false })).toEqual([])
  })
  it('adds active and locked exceptions of every module', () => {
    expect(exceptionsTotal([mod({ overrides: { active: 2, locked: 1 } }), mod({ overrides: { active: 0, locked: 4 } })])).toBe(7)
    expect(exceptionsTotal([])).toBe(0)
  })
})

describe('result sentences', () => {
  const base = { overridesCreated: 0, eventsLocked: 0 }
  it('says nothing changed when no event was affected', () => {
    expect(plansResultText('rsvp', base as never)).toBe('Confirmaciones: planes actualizados. No cambió el acceso de ningún evento actual.')
  })
  it('reports exceptions created and events locked', () => {
    const text = plansResultText('rsvp', { ...base, overridesCreated: 3, eventsLocked: 2 } as never)
    expect(text).toContain('Se crearon 3 excepciones')
    expect(text).toContain('2 eventos perdieron el módulo.')
    expect(text).not.toContain('No cambió')
  })
  it('words a toggle and warns about orphan exceptions only when turning off', () => {
    expect(toggleResultText('rsvp', true, { orphanOverrides: 5 } as never)).toBe('Confirmaciones: encendido para todos.')
    expect(toggleResultText('rsvp', false, { orphanOverrides: 0 } as never)).toBe('Confirmaciones: apagado para todos.')
    expect(toggleResultText('rsvp', false, { orphanOverrides: 5 } as never)).toContain('5 excepciones activas')
  })
})

describe('explainError', () => {
  const http = (status: number, data: object = {}) => ({ response: { status, data } })
  it('reports a lost connection', () => {
    expect(explainError(new Error('Network Error'))).toMatch(/No hay conexión/)
  })
  it('explains the sold-plan code before anything else', () => {
    expect(explainError(http(422, { code: 'module_in_sold_plan' }))).toMatch(/plan de pago incluye todo/)
  })
  it('explains 403, a short reason and the first validation error', () => {
    expect(explainError(http(403))).toMatch(/superadmin/)
    expect(explainError(http(422, { errors: { reason: ['x'] } }))).toMatch(/al menos 5 caracteres/)
    expect(explainError(http(422, { errors: { name: ['Nombre inválido'] } }))).toBe('Nombre inválido')
    expect(explainError(http(422))).toBe('Los datos no son válidos.')
  })
  it('falls back for other failures', () => {
    expect(explainError(http(500))).toBe('No pudimos hacerlo. Inténtalo de nuevo.')
  })
})

describe('planOptions', () => {
  it('maps plans with their guest limit', () => {
    const catalog: Catalog = { modules: [], plans: [FREE, PAID] }
    expect(planOptions(catalog)).toEqual([
      { slug: 'basic', name: 'Gratis', limit: 50 },
      { slug: 'premium', name: 'Completo', limit: null },
    ])
  })
})
