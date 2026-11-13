/** Pure helpers of the Acciones, Contenido and Registro tabs: texts, mapping and request errors. */

export type LifecycleAction = 'publish' | 'unpublish' | 'archive' | 'restore'

export interface ApiError { response?: { status?: number; data?: { message?: string; errors?: Record<string, string[]> } } }

/** The first thing the server said about a failed call, in the person's language when it sent one. */
export function errorMessage(e: unknown, fallback = 'No se pudo completar la acción. Inténtalo de nuevo.'): string {
  const data = (e as ApiError).response?.data
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined
  return first ?? data?.message ?? fallback
}

/** Which lifecycle actions make sense for a status (the API still validates the transition). */
export function availableActions(status: string): LifecycleAction[] {
  if (status === 'draft') return ['publish', 'archive']
  if (status === 'published') return ['unpublish', 'archive']
  if (status === 'archived') return ['restore']
  return []
}

export const LIFECYCLE: Record<LifecycleAction, { title: string; icon: string; description: string; consequence: string; button: string; danger?: boolean }> = {
  publish: {
    title: 'Publicar', icon: 'mdi-send-outline', button: 'Publicar evento',
    description: 'Hace visible la invitación para los invitados.',
    consequence: 'El enlace público empieza a funcionar y se fija la primera fecha de publicación. Si la lista supera el límite del plan, no se puede publicar.',
  },
  unpublish: {
    title: 'Despublicar', icon: 'mdi-eye-off-outline', button: 'Despublicar evento',
    description: 'Vuelve el evento a borrador.',
    consequence: 'Los invitados dejan de ver la invitación. El enlace sigue bloqueado porque ya pudo enviarse.',
  },
  archive: {
    title: 'Archivar', icon: 'mdi-archive-outline', button: 'Archivar evento', danger: true,
    description: 'Guarda el evento y lo saca de circulación.',
    consequence: 'La invitación deja de servirse a los invitados y la dueña lo verá como archivado. Se puede restaurar como borrador.',
  },
  restore: {
    title: 'Restaurar', icon: 'mdi-archive-arrow-up-outline', button: 'Restaurar evento',
    description: 'Saca el evento del archivo.',
    consequence: 'Vuelve como borrador. Publicarlo de nuevo es un paso aparte.',
  },
}

/** Lowercase, accents out, spaces to hyphens: what the slug field accepts. Mirrors the API rule. */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const slugError = (slug: string, current: string | null): string => {
  if (!slug) return 'Escribe el nuevo enlace.'
  if (slug.length > 60) return 'Máximo 60 caracteres.'
  if (!SLUG_RE.test(slug)) return 'Usa solo minúsculas, números y guiones (sin espacios ni acentos).'
  if (slug === current) return 'Ese ya es el enlace actual.'
  return ''
}

export const pageParams = (section: string, page: number) => ({ section, page, perPage: 15 })

/** Staff actions (audit log) in Spanish. */
export const STAFF_ACTION: Record<string, string> = {
  'event.publish': 'Publicó el evento', 'event.unpublish': 'Despublicó el evento', 'event.archive': 'Archivó el evento',
  'event.restore': 'Restauró el evento', 'event.resend_owner_email': 'Reenvió el correo a la dueña',
  'event.resend_collaborator_invite': 'Reenvió una invitación de colaboración', 'event.change_slug': 'Cambió el enlace público',
  'event.transfer_owner': 'Transfirió la titularidad', 'event.change_plan': 'Cambió el plan', 'event.manual_payment': 'Marcó un pago manual',
  'support.note': 'Añadió una nota de soporte', 'support.update': 'Actualizó una solicitud de soporte', 'support.create': 'Creó una solicitud de soporte',
  'event.modules': 'Cambió las funciones del evento', 'event.refund': 'Reembolsó una compra',
  'moderation.hide': 'Ocultó contenido', 'moderation.restore': 'Volvió a mostrar contenido', 'moderation.delete': 'Borró contenido',
}
export const staffActionLabel = (action: string) => STAFF_ACTION[action] ?? 'Acción del personal'

/** What the staff log shows from `before`/`after`, for the actions we know. */
export function staffDetail(action: string, before: Record<string, unknown> | null, after: Record<string, unknown> | null): string {
  if (action === 'event.change_slug') return `${before?.slug ?? '—'} → ${after?.slug ?? '—'}`
  if (action === 'event.transfer_owner') return 'La dueña anterior pasó a editora'
  if (action === 'event.resend_collaborator_invite' && after?.email) return String(after.email)
  return ''
}

export const RSVP_LABEL: Record<string, { label: string; color: string }> = {
  attending: { label: 'Asiste', color: 'success' }, confirmed: { label: 'Asiste', color: 'success' },
  not_attending: { label: 'No asiste', color: 'error' }, declined: { label: 'No asiste', color: 'error' },
  pending: { label: 'Sin responder', color: 'warning' },
}
export const rsvpTone = (s: string | null) => (s && RSVP_LABEL[s]) || { label: s ?? 'Sin responder', color: 'secondary' }

export const PADRINO_STATUS: Record<string, string> = { invited: 'Invitado', accepted: 'Aceptó' }

export const INVITE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'warning' }, expired: { label: 'Vencida', color: 'secondary' },
  accepted: { label: 'Aceptada', color: 'success' }, declined: { label: 'Rechazada', color: 'error' },
}
