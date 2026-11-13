import type { RouteRecordRaw } from 'vue-router'

/**
 * Routes of Eventos (A2). Child routes of the dashboard layout.
 * Until a route named like the menu item exists here, the menu shows the "en construcción" page; adding it replaces that
 * page and removes the "Pronto" tag by itself (see src/modules/index.ts). Give every route a `meta.permission`.
 */
const routes: RouteRecordRaw[] = []

export default routes
