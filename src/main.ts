/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import { API } from './services/axios'

// Components
import App from './App.vue'

// Composable
import { createApp } from 'vue'

import { useCurrentUserStore } from "@/store/currentUser";

;(async () => {
  const app = createApp(App)

  registerPlugins(app)

  app.provide('axios', app.config.globalProperties.axios) // provide axios

  const token = localStorage.getItem('token')
  const currentUser = useCurrentUserStore()

  if (token) {
    API.defaults.headers.common = { Authorization: `Bearer ${token}`}
    await currentUser.getUser()
  }

  app.mount('#app')
})()
