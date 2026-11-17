import type { RouteRecordRaw } from 'vue-router'
import VersionsView from './views/VersionsView.vue'

/** Sistema → Versiones: `Versions` (path `versions`, staff permission admin.system.health like Salud del sistema). */
const routes: RouteRecordRaw[] = [
  {
    path: 'versions',
    name: 'Versions',
    component: VersionsView,
    meta: { title: 'Versiones', pageTitle: 'Versiones', permission: 'admin.system.health' },
  },
]

export default routes
