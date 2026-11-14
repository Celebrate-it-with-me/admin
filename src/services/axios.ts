import axios from 'axios'
import router from '@/router'
import { useCurrentUserStore } from "../store/currentUser";
import { askReauth } from '@/services/reauth'

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
  async (error) => {
    const status = error.response?.status
    // The login form explains its own errors (wrong password, no access): do not redirect from there.
    const isLogin = error.config?.url === 'login' || error.config?.url === 'login/two-factor'

    if (status === 401 && !isLogin) {
      const currentUser = useCurrentUserStore()

      currentUser.$reset()
      // The server ended the session (idle or too old): say so on the login instead of a silent redirect.
      const expired = error.response?.data?.code === 'session_expired'
      router.push(expired ? { name: 'Home', query: { expired: '1' } } : { name: 'Home' })
    }

    // A very sensitive action asked for a recent re-authentication: confirm in the dialog, then repeat the request
    // exactly as it was (so a ReasonDialog flow carries on without being redone). `_reauthRetried` avoids loops.
    if (status === 403 && error.response?.data?.code === 'reauth_required' && error.config && !error.config._reauthRetried) {
      try {
        await askReauth()
      } catch {
        error.reauthCancelled = true
        return Promise.reject(error)
      }
      error.config._reauthRetried = true
      return API.request(error.config)
    }

    // The server requires two-factor for this role and she has not enrolled: only her account pages are open.
    if (status === 403 && error.response?.data?.code === 'two_factor_required') {
      if (router.currentRoute.value.name !== 'Account') router.push({ name: 'Account', query: { tab: 'security' } })
      return Promise.reject(error)
    }

    if (status === 403 && !isLogin && error.response?.data?.code !== 'reauth_required' && router.hasRoute('Unauthorized')) {
      router.push({ name: 'Unauthorized' })
    }

    // Callers need the error (the login shows it); swallowing it left them with `undefined`.
    return Promise.reject(error)
  }
)

export { API }
