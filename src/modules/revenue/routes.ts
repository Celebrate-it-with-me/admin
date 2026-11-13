import type { RouteRecordRaw } from 'vue-router'
import PurchasesView from './views/PurchasesView.vue'
import CouponsView from './views/CouponsView.vue'

/**
 * Routes of Ingresos (A8): `Purchases` (path `purchases`, permission admin.purchases.manage) and `Coupons` (path `coupons`,
 * permission admin.pricing.manage). Child routes of the dashboard layout. Registering them replaces the "en construcción" page.
 */
const routes: RouteRecordRaw[] = [
  {
    path: 'purchases',
    name: 'Purchases',
    component: PurchasesView,
    meta: { title: 'Compras', pageTitle: 'Compras', permission: 'admin.purchases.manage' },
  },
  {
    path: 'coupons',
    name: 'Coupons',
    component: CouponsView,
    meta: { title: 'Precio y códigos', pageTitle: 'Precio y códigos', permission: 'admin.pricing.manage' },
  },
]

export default routes
