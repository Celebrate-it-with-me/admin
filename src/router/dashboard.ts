import Dashboard from "@/layouts/default/Dashboard.vue";
import MainDashboardView from "@/views/MainDashboardView.vue";
import UsersView from "@/views/UsersView.vue";
import ComingSoonView from "@/views/ComingSoonView.vue";
import AuditView from "@/views/AuditView.vue";
import TeamView from "@/views/TeamView.vue";
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
      { path: 'audit', name: 'Audit', component: AuditView, meta: { title: 'Auditoría', pageTitle: 'Auditoría' } },
      { path: 'team', name: 'Team', component: TeamView, meta: { title: 'Equipo y roles', pageTitle: 'Equipo y roles' } },
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
