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
    /**
     * Step one of the sign-in. With two-factor on the API answers a `challenge` instead of a token: the caller then asks
     * for the code and calls `completeTwoFactor`. Returns the response (or the error, as before) for the form to read.
     */
    async login(email: string, password: string, device: string) {
      try {
        const res = await API.post('login', {
          email,
          password,
          device
        })

        if (res.data?.twoFactorRequired) return res

        await this.startSession(res.data)
        return res
      } catch(err) {
        return err;
      }
    },

    /** Step two: challenge + a 6-digit code or a recovery code for the token. */
    async completeTwoFactor(challenge: string, secret: { code?: string; recoveryCode?: string }, device: string) {
      try {
        const res = await API.post('login/two-factor', { challenge, device, ...secret })
        await this.startSession(res.data)
        return res
      } catch (err) {
        return err
      }
    },

    async startSession(token: unknown) {
      if (!token || typeof token !== 'string') return
      API.defaults.headers.common = { Authorization: `Bearer ${token}` }
      localStorage.setItem('token', token)

      await this.getUser()
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

    /** Closes this session on the server too (best effort: the token is dropped locally either way). */
    async logout() {
      try { await API.post('account/logout') } catch { /* already expired, or offline */ }
      delete API.defaults.headers.common.Authorization
      this.$reset()
    },

    $reset() {
      localStorage.removeItem('token')
      this.user = {}
    }
  },
});
