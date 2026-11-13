import type { RouteRecordRaw } from 'vue-router'
import UsersListView from './views/UsersListView.vue'
import UserDetailView from './views/UserDetailView.vue'

/** Routes of Usuarios (A5). Child routes of the dashboard layout. */
const routes: RouteRecordRaw[] = [
  {
    path: 'users',
    name: 'Users',
    component: UsersListView,
    meta: { title: 'Usuarios', pageTitle: 'Usuarios', permission: 'admin.users.view' },
  },
  {
    path: 'users/:id(\\d+)',
    name: 'UserDetail',
    component: UserDetailView,
    meta: { title: 'Usuario', pageTitle: 'Usuario', permission: 'admin.users.view' },
  },
]

export default routes
