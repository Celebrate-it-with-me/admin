import { formatMoney } from '@/composables/useMoney'

/** What each logged action is called, in the words staff read. */
export const ACTION_LABELS: Record<string, { label: string; icon: string; tone: string }> = {
  'auth.login': { label: 'Inició sesión', icon: 'mdi-login', tone: 'info' },
  'auth.login_failed': { label: 'Intento fallido de inicio de sesión', icon: 'mdi-alert-outline', tone: 'warning' },
  'account.profile_updated': { label: 'Actualizó su perfil', icon: 'mdi-account-edit-outline', tone: 'primary' },
  'account.email_change_requested': { label: 'Pidió cambiar su correo', icon: 'mdi-email-edit-outline', tone: 'primary' },
  'account.email_change_cancelled': { label: 'Canceló el cambio de correo', icon: 'mdi-email-remove-outline', tone: 'info' },
  'account.email_changed': { label: 'Cambió su correo de acceso', icon: 'mdi-email-check-outline', tone: 'warning' },
  'account.password_changed': { label: 'Cambió su contraseña', icon: 'mdi-lock-reset', tone: 'warning' },
  'account.two_factor_setup_started': { label: 'Empezó a activar los dos pasos', icon: 'mdi-shield-key-outline', tone: 'info' },
  'account.two_factor_enabled': { label: 'Activó la verificación en dos pasos', icon: 'mdi-shield-check-outline', tone: 'success' },
  'account.two_factor_disabled': { label: 'Desactivó la verificación en dos pasos', icon: 'mdi-shield-off-outline', tone: 'warning' },
  'account.two_factor_failed': { label: 'Código de dos pasos incorrecto', icon: 'mdi-shield-alert-outline', tone: 'warning' },
  'account.two_factor_reset_by_admin': { label: 'Reinició los dos pasos de otra persona', icon: 'mdi-shield-refresh-outline', tone: 'warning' },
  'account.reauth': { label: 'Confirmó su identidad para una acción delicada', icon: 'mdi-shield-lock-outline', tone: 'info' },
  'account.reauth_failed': { label: 'Falló al confirmar su identidad', icon: 'mdi-shield-alert-outline', tone: 'warning' },
  'account.session_expired': { label: 'Su sesión venció', icon: 'mdi-timer-sand', tone: 'info' },
  'account.two_factor_reset_cli': { label: 'Reinicio de los dos pasos (consola)', icon: 'mdi-shield-refresh-outline', tone: 'warning' },
  'account.recovery_codes_regenerated': { label: 'Generó códigos de recuperación', icon: 'mdi-key-chain-variant', tone: 'primary' },
  'account.recovery_code_used': { label: 'Usó un código de recuperación', icon: 'mdi-key-variant', tone: 'warning' },
  'account.session_revoked': { label: 'Cerró una sesión', icon: 'mdi-logout-variant', tone: 'info' },
  'account.sessions_revoked': { label: 'Cerró las demás sesiones', icon: 'mdi-logout-variant', tone: 'info' },
  'account.logout': { label: 'Cerró sesión', icon: 'mdi-logout', tone: 'info' },
  'account.logout_all': { label: 'Cerró sesión en todos lados', icon: 'mdi-logout', tone: 'warning' },
  'payment.manual': { label: 'Registró un pago manual', icon: 'mdi-cash-plus', tone: 'success' },
  'payment.refund': { label: 'Hizo un reembolso', icon: 'mdi-cash-refund', tone: 'warning' },
  'pricing.update': { label: 'Cambió el precio', icon: 'mdi-tag-outline', tone: 'primary' },
  'coupon.create': { label: 'Creó un código', icon: 'mdi-ticket-percent-outline', tone: 'success' },
  'coupon.update': { label: 'Editó un código', icon: 'mdi-ticket-outline', tone: 'primary' },
  'coupon.deactivate': { label: 'Desactivó un código', icon: 'mdi-ticket-confirmation-outline', tone: 'warning' },
  'user.create': { label: 'Creó un usuario', icon: 'mdi-account-plus-outline', tone: 'success' },
  'user.update': { label: 'Editó un usuario', icon: 'mdi-account-edit-outline', tone: 'primary' },
  'user.delete': { label: 'Borró un usuario', icon: 'mdi-account-remove-outline', tone: 'error' },
  'user.password_reset': { label: 'Envió restablecer contraseña', icon: 'mdi-lock-reset', tone: 'primary' },
  'user.suspend': { label: 'Suspendió una cuenta', icon: 'mdi-cancel', tone: 'warning' },
  'user.unsuspend': { label: 'Reactivó una cuenta', icon: 'mdi-account-check-outline', tone: 'success' },
  'user.export': { label: 'Exportó los datos de una cuenta', icon: 'mdi-download-outline', tone: 'info' },
  'team.add': { label: 'Dio acceso al panel', icon: 'mdi-account-key-outline', tone: 'success' },
  'team.create': { label: 'Creó una cuenta del equipo', icon: 'mdi-account-plus-outline', tone: 'success' },
  'team.role_changed': { label: 'Cambió un rol', icon: 'mdi-swap-horizontal', tone: 'primary' },
  'team.removed': { label: 'Quitó el acceso al panel', icon: 'mdi-account-cancel-outline', tone: 'error' },
  'event.publish': { label: 'Publicó un evento', icon: 'mdi-publish', tone: 'success' },
  'event.unpublish': { label: 'Despublicó un evento', icon: 'mdi-publish-off', tone: 'warning' },
  'event.archive': { label: 'Archivó un evento', icon: 'mdi-archive-outline', tone: 'warning' },
  'event.restore': { label: 'Restauró un evento', icon: 'mdi-archive-arrow-up-outline', tone: 'success' },
  'event.plan_change': { label: 'Cambió el plan de un evento', icon: 'mdi-swap-vertical', tone: 'primary' },
  'event.module_override': { label: 'Excepción de módulo', icon: 'mdi-puzzle-outline', tone: 'primary' },
  'event.module_override_removed': { label: 'Excepción de módulo quitada', icon: 'mdi-puzzle-remove-outline', tone: 'warning' },
  'event.change_slug': { label: 'Cambió el enlace de un evento', icon: 'mdi-link-variant', tone: 'warning' },
  'event.transfer_owner': { label: 'Transfirió la titularidad', icon: 'mdi-account-switch-outline', tone: 'warning' },
  'event.resend_owner_email': { label: 'Reenvió un correo a la dueña', icon: 'mdi-email-fast-outline', tone: 'info' },
  'event.resend_collaborator_invite': { label: 'Reenvió una invitación de colaboración', icon: 'mdi-email-sync-outline', tone: 'info' },
  'moderation.hide': { label: 'Ocultó contenido', icon: 'mdi-eye-off-outline', tone: 'warning' },
  'moderation.restore': { label: 'Restauró contenido', icon: 'mdi-eye-outline', tone: 'success' },
  'moderation.delete': { label: 'Borró contenido', icon: 'mdi-delete-outline', tone: 'error' },
  'support.update': { label: 'Actualizó una solicitud de soporte', icon: 'mdi-lifebuoy', tone: 'primary' },
  'support.note': { label: 'Anotó en una solicitud de soporte', icon: 'mdi-note-text-outline', tone: 'info' },
  'impersonation.start': { label: 'Entró como una usuaria', icon: 'mdi-account-eye-outline', tone: 'warning' },
  'impersonation.action': { label: 'Hizo un cambio durante una sesión de soporte', icon: 'mdi-pencil-outline', tone: 'warning' },
  'impersonation.end': { label: 'Terminó de ver como una usuaria', icon: 'mdi-account-eye-off-outline', tone: 'info' },
}

/** The families the filter offers (the API matches `payment` to every `payment.*`). */
export const ACTION_FILTERS = [
  { value: 'payment', title: 'Pagos' },
  { value: 'pricing', title: 'Precio' },
  { value: 'coupon', title: 'Códigos' },
  { value: 'user', title: 'Usuarios' },
  { value: 'event', title: 'Eventos' },
  { value: 'moderation', title: 'Moderación' },
  { value: 'support', title: 'Soporte' },
  { value: 'impersonation', title: 'Impersonación' },
  { value: 'team', title: 'Equipo' },
  { value: 'auth', title: 'Inicios de sesión' },
  { value: 'account', title: 'Cuenta del personal' },
]

export const ROLE_LABELS: Record<string, string> = { superadmin: 'Superadmin', support: 'Soporte' }

const FIELD_LABELS: Record<string, string> = {
  plan: 'Plan', priceCents: 'Precio', amountCents: 'Monto', gateway: 'Pasarela', status: 'Estado', role: 'Rol',
  name: 'Nombre', email: 'Correo', code: 'Código', kind: 'Tipo', value: 'Valor', is_founder: 'De fundador',
  max_uses: 'Usos máximos', expires_at: 'Vence', is_active: 'Activo',
}
const PLAN_LABELS: Record<string, string> = { basic: 'Gratis', premium: 'Completo' }
const STATUS_LABELS: Record<string, string> = { paid: 'Pagado', refunded: 'Reembolsado', pending: 'Pendiente' }

export function actionLabel(action: string) {
  return ACTION_LABELS[action] ?? { label: action, icon: 'mdi-circle-small', tone: 'secondary' }
}

/** One field of the before/after, readable. */
export function fieldLine(key: string, value: unknown): { label: string; text: string } {
  const label = FIELD_LABELS[key] ?? key
  if (value === null || value === undefined || value === '') return { label, text: '—' }
  if (key.endsWith('Cents')) return { label, text: formatMoney(Number(value)) }
  if (key === 'plan') return { label, text: PLAN_LABELS[String(value)] ?? String(value) }
  if (key === 'status') return { label, text: STATUS_LABELS[String(value)] ?? String(value) }
  if (key === 'role') return { label, text: ROLE_LABELS[String(value)] ?? String(value) }
  if (typeof value === 'boolean') return { label, text: value ? 'Sí' : 'No' }
  if (key === 'kind') return { label, text: value === 'fixed_price' ? 'Precio fijo' : value === 'percent_off' ? 'Porcentaje' : String(value) }
  return { label, text: String(value) }
}

/** When it happened: 13 nov 2026, 4:05 p. m. */
export function whenLabel(iso: string, short = false) {
  const d = new Date(iso)
  return short
    ? d.toLocaleString('es-US', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
