/**
 * The admin menu and its pages, from one list (docs/plans/admin-brief.md, modules A1-A13).
 * An item with `soon` has no screen yet: it opens the "en construcción" page with what it will do.
 */
export interface NavItem {
  key: string
  /** Route name and menu label. */
  title: string
  icon: string
  path: string
  /** Not built yet. */
  soon?: boolean
  /** What the page will do (shown on the "en construcción" page). */
  about?: string
  /** Brief code, for the team. */
  brief?: string
}

export interface NavGroup {
  key: string
  title: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    key: 'main',
    title: '',
    items: [
      { key: 'MainDashboard', title: 'Inicio', icon: 'mdi-view-dashboard-outline', path: '' },
    ],
  },
  {
    key: 'operation',
    title: 'Operación',
    items: [
      { key: 'Events', title: 'Eventos', icon: 'mdi-calendar-heart', path: 'events', soon: true, brief: 'A2',
        about: 'Listado con búsqueda y filtros, y la ficha de cada evento: resumen, funciones, plan y pago, contenido, acciones y registro.' },
      { key: 'Users', title: 'Usuarios', icon: 'mdi-account-multiple-outline', path: 'users' },
      { key: 'Support', title: 'Soporte', icon: 'mdi-lifebuoy', path: 'support', soon: true, brief: 'A13',
        about: 'Bandeja de solicitudes de ayuda que llegan desde la app, con el contexto del evento ya adjunto, estado y notas internas.' },
      { key: 'Moderation', title: 'Moderación', icon: 'mdi-shield-check-outline', path: 'moderation', soon: true, brief: 'A6',
        about: 'Cola de comentarios, fotos y contenido reportado, con acciones rápidas y masivas.' },
    ],
  },
  {
    key: 'revenue',
    title: 'Ingresos',
    items: [
      { key: 'Purchases', title: 'Compras', icon: 'mdi-credit-card-outline', path: 'purchases', soon: true, brief: 'A8',
        about: 'Compras de eventos, pago manual (Zelle), reembolsos y conciliación con Stripe.' },
      { key: 'Coupons', title: 'Precio y códigos', icon: 'mdi-ticket-percent-outline', path: 'coupons', soon: true, brief: 'A8',
        about: 'El precio del evento completo y los códigos de fundador y de descuento, con límite de usos y vencimiento.' },
    ],
  },
  {
    key: 'product',
    title: 'Producto',
    items: [
      { key: 'Plans', title: 'Módulos y planes', icon: 'mdi-puzzle-outline', path: 'plans', soon: true, brief: 'A4',
        about: 'Qué módulos incluye cada plan, con interruptores y sin desplegar, y funciones regaladas a un solo evento.' },
      { key: 'Templates', title: 'Plantillas', icon: 'mdi-palette-outline', path: 'templates', soon: true, brief: 'A7',
        about: 'Constructor de plantillas de invitación con vista previa en vivo, versiones y reglas por plan.' },
    ],
  },
  {
    key: 'comms',
    title: 'Comunicación',
    items: [
      { key: 'WhatsApp', title: 'WhatsApp', icon: 'mdi-whatsapp', path: 'whatsapp', soon: true, brief: 'A9',
        about: 'Mensajes enviados, estado de entrega, errores por número y aprobación de plantillas de Meta.' },
      { key: 'Announcements', title: 'Anuncios', icon: 'mdi-bullhorn-outline', path: 'announcements', soon: true, brief: 'A12',
        about: 'Anuncios y correos a usuarios por segmentos, y editor de los textos de correos y mensajes (es/en).' },
    ],
  },
  {
    key: 'system',
    title: 'Sistema',
    items: [
      { key: 'Team', title: 'Equipo y roles', icon: 'mdi-account-key-outline', path: 'team', soon: true, brief: 'A1',
        about: 'Personal del panel con roles de soporte y superadministrador, y permisos por acción.' },
      { key: 'Audit', title: 'Auditoría', icon: 'mdi-history', path: 'audit', soon: true, brief: 'A1',
        about: 'Registro de todo lo que hace el personal: quién, a quién, cuándo y por qué.' },
      { key: 'Health', title: 'Salud del sistema', icon: 'mdi-heart-pulse', path: 'health', soon: true, brief: 'A10',
        about: 'Trabajos fallidos, colas, errores recientes, banderas de funciones y modo mantenimiento.' },
    ],
  },
]

export const PLACEHOLDERS: NavItem[] = NAV.flatMap(g => g.items).filter(i => i.soon)
