import axios from 'axios'
import router from '@/router'
import { useCurrentUserStore } from "../store/currentUser";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL + 'api/v1/admin',
  headers: {
    Accept: 'application/json'
  }
})

API.interceptors.response.use(
  (response)  => {
    return response
  },
  (error) => {
    const status = error.response?.status
    // The login form explains its own errors (wrong password, no access): do not redirect from there.
    const isLogin = error.config?.url === 'login' || error.config?.url === 'login/two-factor'

    if (status === 401 && !isLogin) {
      const currentUser = useCurrentUserStore()

      currentUser.$reset()
      router.push({ name: 'Home' })
    }

    // The server requires two-factor for this role and she has not enrolled: only her account pages are open.
    if (status === 403 && error.response?.data?.code === 'two_factor_required') {
      if (router.currentRoute.value.name !== 'Account') router.push({ name: 'Account', query: { tab: 'security' } })
      return Promise.reject(error)
    }

    if (status === 403 && !isLogin && router.hasRoute('Unauthorized')) {
      router.push({ name: 'Unauthorized' })
    }

    // Callers need the error (the login shows it); swallowing it left them with `undefined`.
    return Promise.reject(error)
  }
)

export { API }
