import type { RouteRecordRaw } from 'vue-router'
import HealthView from './views/HealthView.vue'

/**
 * Route of Salud del sistema (A10): `Health` (path `health`, permission admin.system.health, the one the menu item declares).
 * Child route of the dashboard layout. Registering it replaces the "en construcción" page.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'health',
    name: 'Health',
    component: HealthView,
    meta: { title: 'Salud del sistema', pageTitle: 'Salud del sistema', permission: 'admin.system.health' },
  },
]

export default routes
