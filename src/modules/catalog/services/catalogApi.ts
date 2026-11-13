import { API } from '@/services/axios'
import type { Catalog, Impact, PlanChanges, PlanImpact, PlansUpdateResult, PlanUpdateResult, ToggleResult } from '../types'

export async function fetchCatalog(): Promise<Catalog> {
  return (await API.get('catalog')).data.data
}

/** An empty `planSlugs` is valid: it asks what would happen if the module were left in no plan (axios omits the key). */
export async function fetchImpact(module: string, planSlugs: string[]): Promise<Impact> {
  return (await API.get('catalog/impact', { params: { module, planSlugs } })).data.data
}

/** How many events of the plan would be above this guest limit (0 = unlimited). Nothing is saved. */
export async function fetchPlanImpact(slug: string, maxGuests: number): Promise<PlanImpact> {
  return (await API.get(`catalog/plans/${slug}/impact`, { params: { maxGuests } })).data.data
}

export async function savePlan(slug: string, body: PlanChanges & { reason: string }): Promise<PlanUpdateResult> {
  return (await API.patch(`catalog/plans/${slug}`, body)).data.data
}

export async function saveModulePlans(module: string, body: { planSlugs: string[]; reason: string; keepForExisting: boolean }): Promise<PlansUpdateResult> {
  return (await API.put(`catalog/modules/${module}/plans`, body)).data.data
}

export async function saveModuleEnabled(module: string, body: { isEnabled: boolean; reason: string }): Promise<ToggleResult> {
  return (await API.patch(`catalog/modules/${module}`, body)).data.data
}
