import type { RouteRecordRaw } from 'vue-router'
import TeamView from './views/TeamView.vue'
import AcceptInviteView from './views/AcceptInviteView.vue'

/**
 * Equipo y roles (Sistema): `Team` (path `team`, permission admin.team.manage, the one the menu item declares), a child of
 * the dashboard layout. `publicRoutes` holds `/accept-invite?token=`, the page the invitation mail opens: outside the
 * dashboard layout, with no session needed (it signs her in).
 */
const routes: RouteRecordRaw[] = [
  { path: 'team', name: 'Team', component: TeamView, meta: { title: 'Equipo y roles', pageTitle: 'Equipo y roles', permission: 'admin.team.manage' } },
]

export const publicRoutes: RouteRecordRaw[] = [
  { path: '/accept-invite', name: 'AcceptInvite', component: AcceptInviteView, meta: { title: 'Aceptar invitación' } },
]

export default routes
