import Dashboard from "@/layouts/default/Dashboard.vue";
import MainDashboardView from "@/views/MainDashboardView.vue";
import ComingSoonView from "@/views/ComingSoonView.vue";
import AuditView from "@/views/AuditView.vue";
import TeamView from "@/views/TeamView.vue";
import { PLACEHOLDERS } from "@/config/navigation";
import { moduleRoutes, builtKeys } from "@/modules";

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
      ...moduleRoutes,
      { path: 'audit', name: 'Audit', component: AuditView, meta: { title: 'Auditoría', pageTitle: 'Auditoría' } },
      { path: 'team', name: 'Team', component: TeamView, meta: { title: 'Equipo y roles', pageTitle: 'Equipo y roles' } },
      // Pages that are on the menu but not built yet.
      ...PLACEHOLDERS.filter(item => !builtKeys.has(item.key)).map(item => ({
        path: item.path,
        name: item.key,
        component: ComingSoonView,
        meta: { title: item.title, pageTitle: item.title }
      }))
    ]
  }
]
