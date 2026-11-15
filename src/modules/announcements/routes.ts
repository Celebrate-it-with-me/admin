import type { RouteRecordRaw } from 'vue-router'
import AnnouncementsView from './views/AnnouncementsView.vue'

/** Comunicación → Anuncios: `Announcements` (path `announcements`, permission admin.catalog.manage, the one the menu item declares), a child of the dashboard layout. */
const routes: RouteRecordRaw[] = [
  { path: 'announcements', name: 'Announcements', component: AnnouncementsView, meta: { title: 'Anuncios', pageTitle: 'Anuncios', permission: 'admin.catalog.manage' } },
]

export default routes
