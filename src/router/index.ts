// Composable
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from "@/views/LoginView.vue";
import dashboard from "@/router/dashboard";
import { PERMISSION_BY_ROUTE } from "@/config/navigation";
import { useCurrentUserStore } from "@/store/currentUser";

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: LoginView,
        // route level code-splitting
        // this generates a separate chunk (Home-[hash].js) for this route
        // which is lazy-loaded when the route is visited.
        meta: {
          title: 'Home'
        }
      },
      {
        path: '/login',
        name: 'Login',
        component: LoginView,
        meta: {
          title: 'Login'
        }
      },
      ...dashboard
    ],
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  // A page that needs a permission the person does not have goes back to the start.
  const needed = (to.meta?.permission as string | undefined) ?? (typeof to.name === 'string' ? PERMISSION_BY_ROUTE[to.name] : undefined)
  if (needed) {
    const user = useCurrentUserStore()
    await user.ensureLoaded()
    if (!user.can(needed)) return { name: 'MainDashboard' }
  }
  document.title = to.meta?.title ? `Quinvite Admin - ${to.meta.title}` : 'Quinvite Admin'
});

export default router
