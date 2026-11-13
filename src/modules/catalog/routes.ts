import type { RouteRecordRaw } from 'vue-router'

/**
 * Route of Módulos y planes (A4). Child route of the dashboard layout.
 * Seeing the matrix needs admin.catalog.view; the edit controls check admin.catalog.manage inside the view.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'plans',
    name: 'Plans',
    component: () => import('./views/CatalogView.vue'),
    meta: { title: 'Módulos y planes', pageTitle: 'Módulos y planes', permission: 'admin.catalog.view' },
  },
]

export default routes
