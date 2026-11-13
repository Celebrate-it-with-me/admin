import type { AssignFilter, SupportStatus } from './types'

export const STATUSES: { value: SupportStatus; label: string; color: string; icon: string }[] = [
  { value: 'new', label: 'Nuevas', color: 'primary', icon: 'mdi-inbox-arrow-down-outline' },
  { value: 'in_progress', label: 'En curso', color: 'warning', icon: 'mdi-progress-clock' },
  { value: 'resolved', label: 'Resueltas', color: 'success', icon: 'mdi-check-circle-outline' },
]

const SINGULAR: Record<SupportStatus, string> = { new: 'Nueva', in_progress: 'En curso', resolved: 'Resuelta' }

export function statusInfo(status: SupportStatus) {
  const found = STATUSES.find(s => s.value === status)
  return { label: SINGULAR[status] ?? status, color: found?.color ?? 'secondary', icon: found?.icon ?? 'mdi-help-circle-outline' }
}

/** Query string for GET /support: only what is set. */
export function buildParams(f: { status: SupportStatus; assigned: AssignFilter; search: string; page: number; perPage: number }) {
  return {
    status: f.status,
    assignedTo: f.assigned === 'all' ? undefined : f.assigned,
    search: f.search.trim() || undefined,
    page: f.page,
    perPage: f.perPage,
  }
}

/** First characters of a message on one line, cut at a word. */
export function preview(message: string, max = 140): string {
  const line = message.replace(/\s+/g, ' ').trim()
  if (line.length <= max) return line
  const cut = line.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/** "hace 5 min", "hace 3 h", "hace 2 días"; older than a month: the date. */
export function ageLabel(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'justo ahora'
  if (min < 60) return `hace ${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} ${days === 1 ? 'día' : 'días'}`
  return new Date(iso).toLocaleDateString('es-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fullDate(iso: string): string {
  return new Date(iso).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const CONTEXT_LABELS: [string, string][] = [
  ['screen', 'Pantalla'], ['route', 'Ruta'], ['eventName', 'Evento'], ['plan', 'Plan'],
  ['browser', 'Navegador'], ['language', 'Idioma'], ['viewport', 'Tamaño de pantalla'],
]

/** Readable rows of the context the app attached; empty values are skipped. */
export function contextRows(context: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  const ctx = context ?? {}
  const rows = CONTEXT_LABELS
    .filter(([key]) => ctx[key] !== null && ctx[key] !== undefined && String(ctx[key]).trim() !== '')
    .map(([key, label]) => ({ label, value: key === 'language' ? languageName(String(ctx[key])) : key === 'plan' ? planName(String(ctx[key])) : String(ctx[key]) }))
  return rows
}

const planName = (plan: string) => (plan === 'free' ? 'Gratis' : plan === 'full' ? 'Evento completo' : plan)

function languageName(code: string): string {
  const base = code.toLowerCase().slice(0, 2)
  return base === 'es' ? 'Español' : base === 'en' ? 'Inglés' : code
}

export const NOTE_MIN = 2
export const NOTE_MAX = 2000
export const noteValid = (body: string) => body.trim().length >= NOTE_MIN && body.trim().length <= NOTE_MAX
