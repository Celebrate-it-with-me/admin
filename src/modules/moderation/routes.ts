import type { RouteRecordRaw } from 'vue-router'
import ModerationView from './views/ModerationView.vue'

/** Routes of Moderación (A6). Child routes of the dashboard layout; every route carries its `meta.permission`. */
const routes: RouteRecordRaw[] = [
  {
    path: 'moderation',
    name: 'Moderation',
    component: ModerationView,
    meta: { title: 'Moderación', pageTitle: 'Moderación', permission: 'admin.content.moderate' },
  },
]

export default routes
