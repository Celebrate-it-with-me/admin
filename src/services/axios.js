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
    if (error.response.status === 401) {
      const currentUser = useCurrentUserStore()

      currentUser.$reset()
      router.push({ name: 'Home' })
    }

    if (error.response.status === 403) {
      router.push({ name: 'Unauthorized' })
    }
  }
)

export { API }
