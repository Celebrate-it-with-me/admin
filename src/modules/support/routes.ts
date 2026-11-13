import type { RouteRecordRaw } from 'vue-router'

/**
 * Routes of Soporte (A13). Child routes of the dashboard layout.
 * Until a route named like the menu item exists here, the menu shows the "en construcción" page; adding it replaces that
 * page and removes the "Pronto" tag by itself (see src/modules/index.ts). Give every route a `meta.permission`.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'support',
    name: 'Support',
    component: () => import('./views/SupportInboxView.vue'),
    meta: { title: 'Soporte', pageTitle: 'Soporte', permission: 'admin.support.manage' },
  },
  {
    path: 'support/:id(\\d+)',
    name: 'SupportDetail',
    component: () => import('./views/SupportDetailView.vue'),
    meta: { title: 'Solicitud de soporte', pageTitle: 'Soporte', permission: 'admin.support.manage' },
  },
]

export default routes
