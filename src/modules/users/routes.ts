import type { RouteRecordRaw } from 'vue-router'
import UsersView from '@/views/UsersView.vue'

/** Routes of Usuarios (A5). Child routes of the dashboard layout; give every route a `meta.permission`. */
const routes: RouteRecordRaw[] = [
  {
    path: '/users',
    name: 'Users',
    component: UsersView,
    meta: { title: 'Usuarios', pageTitle: 'Usuarios' },
  },
]

export default routes
