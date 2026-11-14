import type { RouteRecordRaw } from 'vue-router'
import MessageEditorView from './views/MessageEditorView.vue'
import MessagesView from './views/MessagesView.vue'

/** Comunicación → Textos de mensajes: `Messages` (list) and `MessageEditor` (one message), children of the dashboard layout. */
const routes: RouteRecordRaw[] = [
  { path: 'messages', name: 'Messages', component: MessagesView, meta: { title: 'Textos de mensajes', pageTitle: 'Textos de mensajes', permission: 'admin.events.view' } },
  { path: 'messages/:key', name: 'MessageEditor', component: MessageEditorView, meta: { title: 'Editar mensaje', pageTitle: 'Editar mensaje', permission: 'admin.events.view' } },
]

export default routes
