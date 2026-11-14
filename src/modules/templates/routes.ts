import type { RouteRecordRaw } from 'vue-router'

/**
 * Routes of Plantillas (A7). Child routes of the dashboard layout. Superadmin only (admin.templates.manage).
 * A route named like the menu item (`Templates`) replaces the "en construcción" page and removes the "Pronto" tag.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'templates',
    name: 'Templates',
    component: () => import('./views/TemplatesView.vue'),
    meta: { title: 'Plantillas', pageTitle: 'Plantillas', permission: 'admin.templates.manage' },
  },
  {
    path: 'templates/:id(\\d+)',
    name: 'TemplateDetail',
    component: () => import('./views/TemplateDetailView.vue'),
    props: route => ({ id: Number(route.params.id) }),
    meta: { title: 'Plantilla', pageTitle: 'Plantilla', permission: 'admin.templates.manage' },
  },
  {
    path: 'templates/:id(\\d+)/versions/:versionId(\\d+)',
    name: 'TemplateEditor',
    component: () => import('./views/TemplateEditorView.vue'),
    props: route => ({ id: Number(route.params.id), versionId: Number(route.params.versionId) }),
    meta: { title: 'Editor de plantilla', pageTitle: 'Editor de plantilla', permission: 'admin.templates.manage' },
  },
]

export default routes
