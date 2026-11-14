import type { RouteRecordRaw } from 'vue-router'
import AccountView from './views/AccountView.vue'
import ConfirmEmailView from './views/ConfirmEmailView.vue'

/**
 * Mi cuenta (account and security of the staff): `Account` (tabs Perfil / Seguridad / Sesiones, `?tab=`) and
 * `AccountConfirmEmail` (the page the email-change link opens). No `meta.permission`: every staff member has it. They
 * are not in the side menu; the user menu of the layout links to them. Without a saved session they send you to the login
 * and bring you back afterwards (`redirect`).
 */
const needsLogin: RouteRecordRaw['beforeEnter'] = to => (localStorage.getItem('token') ? true : { name: 'Login', query: { redirect: to.fullPath } })

const routes: RouteRecordRaw[] = [
  { path: 'account', name: 'Account', component: AccountView, beforeEnter: needsLogin, meta: { title: 'Mi cuenta', pageTitle: 'Mi cuenta' } },
  { path: 'account/confirm-email', name: 'AccountConfirmEmail', component: ConfirmEmailView, beforeEnter: needsLogin, meta: { title: 'Confirmar correo', pageTitle: 'Confirmar correo' } },
]

export default routes
