// User Utilities
import { defineStore } from 'pinia'
import { API } from '@/services/axios'
import type { CurrentUser } from '@/types'

export const useCurrentUserStore = defineStore('currentUser', {
  state: () => ({
    user: {} as CurrentUser,
    userPermissions: [] as string[] | undefined
  }),
  actions: {
    async login(email: string, password: string, device: string) {
      try {
        const res = await API.post('login', {
          email,
          password,
          device
        })

        if (res.data) {
          API.defaults.headers.common = { Authorization: `Bearer ${res.data}` }
          localStorage.setItem('token', res.data)

          await this.getUser()
        }

        return res
      } catch(err) {
        return err;
      }
    },

    async getUser() {
      try {
        const res = await API.get('userInfo')

        // The API wraps the resource in `data`.
        this.user = res.data?.data ?? res.data
        await this.setUserPermissions()

      } catch {
        this.$reset()
      }
    },

    async setUserPermissions() {
      this.userPermissions = this.user.permissions
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasPermissionTo(permissionName: string) {
      // todo check permissions
    },

    logout() {
      this.$reset()
    },

    $reset() {
      localStorage.removeItem('token')
      this.user = {}
    }
  },
});
