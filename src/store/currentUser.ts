// User Utilities
import { defineStore } from 'pinia'
import { API } from '@/services/axios'
import type { CurrentUser } from '@/types'

export const useCurrentUserStore = defineStore('currentUser', {
  state: () => ({
    user: {} as CurrentUser,
    userPermissions: [] as string[] | undefined
  }),
  getters: {
    isLoaded: (state) => Boolean(state.user?.email),
    /** Whether the logged-in staff member may do this (the API checks it again on every call). */
    can: (state) => (permission?: string): boolean => !permission || (state.user?.permissions ?? []).includes(permission),
  },
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

    hasPermissionTo(permissionName: string) {
      return this.can(permissionName)
    },

    /** Before the first screen: with a saved token, wait for who the user is. */
    async ensureLoaded() {
      if (!this.isLoaded && localStorage.getItem('token')) await this.getUser()
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
