import { API } from '@/services/axios'
import type { Catalog, Impact, PlansUpdateResult, ToggleResult } from '../types'

export async function fetchCatalog(): Promise<Catalog> {
  return (await API.get('catalog')).data.data
}

/**
 * The API cannot take an empty `planSlugs` in a GET (it needs the key present as an array). To see what leaving the
 * module in no plan would do, ask about a plan it is not in (so every current plan shows as removed), then drop that plan's row.
 */
export async function fetchImpact(module: string, planSlugs: string[], allSlugs: string[], currentSlugs: string[]): Promise<Impact> {
  if (planSlugs.length) return (await API.get('catalog/impact', { params: { module, planSlugs } })).data.data
  const probe = allSlugs.find(s => !currentSlugs.includes(s))
  if (!probe) throw new Error('no probe plan')
  const raw: Impact = (await API.get('catalog/impact', { params: { module, planSlugs: [probe] } })).data.data
  const plans = raw.plans.filter(p => p.slug !== probe)
  return {
    ...raw,
    planSlugs: [],
    plans,
    totalToLocked: plans.reduce((n, p) => n + p.toLocked, 0),
    totalToActive: plans.reduce((n, p) => n + p.toActive, 0),
  }
}

export async function saveModulePlans(module: string, body: { planSlugs: string[]; reason: string; keepForExisting: boolean }): Promise<PlansUpdateResult> {
  return (await API.put(`catalog/modules/${module}/plans`, body)).data.data
}

export async function saveModuleEnabled(module: string, body: { isEnabled: boolean; reason: string }): Promise<ToggleResult> {
  return (await API.patch(`catalog/modules/${module}`, body)).data.data
}
