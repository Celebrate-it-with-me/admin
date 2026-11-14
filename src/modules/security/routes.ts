import type { RouteRecordRaw } from 'vue-router'
import SecurityView from './views/SecurityView.vue'

/**
 * Route of Seguridad (Sistema): `Security` (path `security`, permission admin.security.manage, the one the menu item
 * declares). The switch that requires two-factor from all the staff. Child route of the dashboard layout.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'security',
    name: 'Security',
    component: SecurityView,
    meta: { title: 'Seguridad', pageTitle: 'Seguridad', permission: 'admin.security.manage' },
  },
]

export default routes
