import { formatMoney } from '@/composables/useMoney'

/** What each logged action is called, in the words staff read. */
export const ACTION_LABELS: Record<string, { label: string; icon: string; tone: string }> = {
  'auth.login': { label: 'Inició sesión', icon: 'mdi-login', tone: 'info' },
  'payment.manual': { label: 'Registró un pago manual', icon: 'mdi-cash-plus', tone: 'success' },
  'payment.refund': { label: 'Hizo un reembolso', icon: 'mdi-cash-refund', tone: 'warning' },
  'pricing.update': { label: 'Cambió el precio', icon: 'mdi-tag-outline', tone: 'primary' },
  'coupon.create': { label: 'Creó un código', icon: 'mdi-ticket-percent-outline', tone: 'success' },
  'coupon.update': { label: 'Editó un código', icon: 'mdi-ticket-outline', tone: 'primary' },
  'coupon.deactivate': { label: 'Desactivó un código', icon: 'mdi-ticket-confirmation-outline', tone: 'warning' },
  'user.create': { label: 'Creó un usuario', icon: 'mdi-account-plus-outline', tone: 'success' },
  'user.update': { label: 'Editó un usuario', icon: 'mdi-account-edit-outline', tone: 'primary' },
  'user.delete': { label: 'Borró un usuario', icon: 'mdi-account-remove-outline', tone: 'error' },
  'team.add': { label: 'Dio acceso al panel', icon: 'mdi-account-key-outline', tone: 'success' },
  'team.create': { label: 'Creó una cuenta del equipo', icon: 'mdi-account-plus-outline', tone: 'success' },
  'team.role_changed': { label: 'Cambió un rol', icon: 'mdi-swap-horizontal', tone: 'primary' },
  'team.removed': { label: 'Quitó el acceso al panel', icon: 'mdi-account-cancel-outline', tone: 'error' },
}

/** The families the filter offers (the API matches `payment` to every `payment.*`). */
export const ACTION_FILTERS = [
  { value: 'payment', title: 'Pagos' },
  { value: 'pricing', title: 'Precio' },
  { value: 'coupon', title: 'Códigos' },
  { value: 'user', title: 'Usuarios' },
  { value: 'team', title: 'Equipo' },
  { value: 'auth', title: 'Inicios de sesión' },
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
