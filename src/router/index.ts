// Composables
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from "@/views/LoginView.vue";
import dashboard from "@/router/dashboard";

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

router.beforeEach((to, from, next) => {
  document.title = `CWM - ${to.meta?.title}` || 'CWM'
  next();
});

export default router
