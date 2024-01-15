import Dashboard from "@/layouts/default/Dashboard.vue";
import MainDashboardView from "@/views/MainDashboardView.vue";
import UsersView from "@/views/UsersView.vue";
import RSVPView from "@/views/RSVPView.vue";

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
          title: 'Dashboard',
          pageTitle: 'Dashboard'
        }
      },
      {
        path: '/users',
        name: 'Users',
        component: UsersView,
        meta: {
          title: 'User',
          pageTitle: 'User'
        }
      },
      {
        path: '/rsvp',
        name: 'RSVP',
        component: RSVPView,
        meta: {
          title: 'Rsvp',
          pageTitle: 'RSVP'
        }
      }
    ]
  }
]
