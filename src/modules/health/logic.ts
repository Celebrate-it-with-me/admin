import type { Probe } from './types'

/** "hace 5 min", "hace 2 h", "hace 3 d" from a number of seconds. */
export function agoFromSeconds(seconds: number): string {
  if (seconds < 60) return 'hace menos de 1 min'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return `hace ${Math.floor(seconds / 86400)} d`
}

export function agoFromDate(iso: string | null, now = Date.now()): string {
  if (!iso) return '—'
  return agoFromSeconds(Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000)))
}

export function dateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

/** Last segment of a class name: App\Jobs\SendInvite -> SendInvite. */
export function shortClass(name: string | null): string {
  if (!name) return 'Desconocido'
  return name.split('\\').pop() || name
}

export const PROBE_TEXT: Record<Probe, string> = { ok: 'Responde', error: 'No responde', unknown: 'Sin datos' }
export const PROBE_ICON: Record<Probe, string> = { ok: 'mdi-check-circle-outline', error: 'mdi-alert-circle-outline', unknown: 'mdi-help-circle-outline' }
export const PROBE_COLOR: Record<Probe, string> = { ok: 'success', error: 'error', unknown: 'default' }

export const SCHEDULER_TEXT = { ok: 'Activo', stale: 'Detenido o retrasado', unknown: 'Sin datos' } as const
export const SCHEDULER_PROBE = { ok: 'ok', stale: 'error', unknown: 'unknown' } as const

export const LEVEL_TEXT: Record<string, string> = { error: 'Error', critical: 'Crítico', alert: 'Alerta', emergency: 'Emergencia' }

export const SECTION_TEXT: Record<string, string> = { main: 'Principal', guests: 'Invitados', organization: 'Organización', extras: 'Extras' }

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
