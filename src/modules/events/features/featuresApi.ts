import { API } from '@/services/axios'
import type { EventModulesData, ModuleState } from './logic'

export async function fetchEventModules(eventId: number): Promise<EventModulesData> {
  return (await API.get(`events/${eventId}/modules`)).data.data
}

export async function setModuleOverride(eventId: number, module: string, body: { state: ModuleState; expiresAt: string | null; reason: string }): Promise<EventModulesData> {
  return (await API.put(`events/${eventId}/modules/${module}`, body)).data.data
}

export async function removeModuleOverride(eventId: number, module: string, reason: string): Promise<EventModulesData> {
  return (await API.delete(`events/${eventId}/modules/${module}`, { data: { reason } })).data.data
}

/** The first validation message the server sent, or a generic one. */
export function explainError(e: unknown): string {
  const data = (e as { response?: { data?: { errors?: Record<string, string[]>; message?: string } } })?.response?.data
  const first = Object.values(data?.errors ?? {})[0]?.[0]
  return first ?? data?.message ?? 'No pudimos hacerlo. Inténtalo de nuevo.'
}
