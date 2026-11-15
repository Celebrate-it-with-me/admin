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
    path: 'templates/packages',
    name: 'TemplatePackages',
    component: () => import('./packages/views/PackagesView.vue'),
    meta: { title: 'Paquetes de plantilla', pageTitle: 'Paquetes de plantilla', permission: 'admin.templates.manage' },
  },
  {
    path: 'templates/packages/new',
    name: 'TemplatePackageNew',
    component: () => import('./packages/views/PackageInstallView.vue'),
    meta: { title: 'Subir paquete', pageTitle: 'Subir paquete', permission: 'admin.templates.manage' },
  },
  {
    path: 'templates/packages/:id(\\d+)',
    name: 'TemplatePackageDetail',
    component: () => import('./packages/views/PackageDetailView.vue'),
    props: route => ({ id: Number(route.params.id) }),
    meta: { title: 'Paquete', pageTitle: 'Paquete', permission: 'admin.templates.manage' },
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
