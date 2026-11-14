import type { RouteRecordRaw } from 'vue-router'
import WhatsAppView from './views/WhatsAppView.vue'

/** WhatsApp (A9, Comunicación): `WhatsApp` (path `whatsapp`, read permission admin.events.view; writes need admin.whatsapp.manage). */
const routes: RouteRecordRaw[] = [
  { path: 'whatsapp', name: 'WhatsApp', component: WhatsAppView, meta: { title: 'WhatsApp', pageTitle: 'WhatsApp', permission: 'admin.events.view' } },
]

export default routes
