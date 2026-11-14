import type { RouteRecordRaw } from 'vue-router'
import InvoicesView from './views/InvoicesView.vue'

/** Facturas (A14): `Invoices` (path `invoices`, permission admin.purchases.manage). Child route of the dashboard layout. */
const routes: RouteRecordRaw[] = [
  {
    path: 'invoices',
    name: 'Invoices',
    component: InvoicesView,
    meta: { title: 'Facturas', pageTitle: 'Facturas', permission: 'admin.purchases.manage' },
  },
]

export default routes
