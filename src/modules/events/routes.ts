import type { RouteRecordRaw } from 'vue-router'

/**
 * Routes of Eventos (A2). Child routes of the dashboard layout.
 * A route named like the menu item replaces the "en construcción" page and removes the "Pronto" tag by itself.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'events',
    name: 'Events',
    component: () => import('./views/EventsListView.vue'),
    meta: { title: 'Eventos', pageTitle: 'Eventos', permission: 'admin.events.view' },
  },
  {
    path: 'events/:id(\\d+)',
    name: 'EventDetail',
    component: () => import('./views/EventDetailView.vue'),
    props: true,
    meta: { title: 'Evento', pageTitle: 'Evento', permission: 'admin.events.view' },
  },
]

export default routes
