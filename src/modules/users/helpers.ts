import type { UserFilters } from './types'

/** Query string of the list: empty filters are left out so the URL stays clean. */
export function buildListParams(f: UserFilters, page: number, perPage: number): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = { page, perPage }
  if (f.search.trim()) params.search = f.search.trim()
  if (f.kind) params.kind = f.kind
  if (f.status) params.status = f.status
  if (f.internal) params.internal = 1
  return params
}

const MESSAGES: Record<string, string> = {
  cannot_target_self: 'No puedes hacerlo sobre tu propia cuenta.',
  cannot_target_staff: 'Es una cuenta del equipo: primero quítale el acceso en "Equipo y roles".',
  already_suspended: 'La cuenta ya estaba suspendida.',
  not_suspended: 'La cuenta no está suspendida.',
  already_deleted: 'La cuenta ya fue borrada (anonimizada).',
  account_deleted: 'La cuenta ya fue anonimizada: no tiene correo al que escribir.',
  email_mismatch: 'El correo escrito no coincide con el de la cuenta.',
  reason: 'Escribe un motivo de al menos 5 caracteres.',
}

/** The first validation code of a 422 turned into a sentence for the team; anything else gets a generic text. */
export function explainError(e: unknown, fallback = 'No pudimos hacerlo. Inténtalo de nuevo.'): string {
  const body = (e as { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } })?.response
  const errors = body?.data?.errors ?? {}
  for (const [field, codes] of Object.entries(errors)) {
    const code = codes?.[0]
    if (code && MESSAGES[code]) return MESSAGES[code]
    if (code && MESSAGES[field]) return MESSAGES[field]
    if (code && body?.status === 422) return code
  }
  return fallback
}

export const ROLE_IN_EVENT: Record<string, string> = { owner: 'Dueña', editor: 'Editora', viewer: 'Lectora' }
export const EVENT_STATUS: Record<string, string> = { draft: 'Borrador', published: 'Publicado', archived: 'Archivado', active: 'Activo' }

/** File name from a Content-Disposition header, or a fallback. */
export function filenameFrom(disposition: string | undefined, fallback: string): string {
  const m = /filename="?([^";]+)"?/i.exec(disposition ?? '')
  return m ? m[1] : fallback
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?'
}

export function dateLabel(iso: string | null, withTime = false): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-US', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' })
}
