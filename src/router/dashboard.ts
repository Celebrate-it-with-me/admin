import Dashboard from "@/layouts/default/Dashboard.vue";
import MainDashboardView from "@/views/MainDashboardView.vue";
import UsersView from "@/views/UsersView.vue";
import RSVPView from "@/views/RSVPView.vue";
import SMSReminderView from "@/views/SMSReminderView.vue";
import ImagesManagerView from "@/views/ImagesManagerView.vue";
import ComingSoonView from "@/views/ComingSoonView.vue";
import { PLACEHOLDERS } from "@/config/navigation";

export default [
  {
    path: 'dashboard',
    component: Dashboard,
    children: [
      {
        path: '',
        name: 'MainDashboard',
        component: MainDashboardView,
        meta: {
          title: 'Inicio',
          pageTitle: 'Inicio'
        }
      },
      {
        path: '/users',
        name: 'Users',
        component: UsersView,
        meta: {
          title: 'Usuarios',
          pageTitle: 'Usuarios'
        }
      },
      {
        path: '/rsvp',
        name: 'RSVP',
        component: RSVPView,
        meta: {
          title: 'Rsvp',
          pageTitle: 'Confirmaciones'
        }
      },
      {
        path: 'sms-reminder',
        name: 'SMSReminder',
        component: SMSReminderView,
        meta: {
          title: 'SMS Reminder',
          pageTitle: 'Recordatorios SMS'
        }
      },
      {
        path: 'images-manager',
        name: 'ImagesManager',
        component: ImagesManagerView,
        meta: {
          title: 'Images Manager',
          pageTitle: 'Imágenes'
        }
      },
      // Pages that are on the menu but not built yet.
      ...PLACEHOLDERS.map(item => ({
        path: item.path,
        name: item.key,
        component: ComingSoonView,
        meta: { title: item.title, pageTitle: item.title }
      }))
    ]
  }
]
