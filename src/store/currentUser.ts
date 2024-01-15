// User Utilities
import { defineStore } from 'pinia'
import { API } from '@/services/axios'

export const useCurrentUserStore = defineStore('currentUser', {
  state: () => ({
    user: {},
    userPermissions: []
  }),
  actions: {
    async login(email, password, device) {
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

        this.user = res.data
        await this.setUserPermissions()

      } catch(err) {
        this.$reset()
      }
    },

    async setUserPermissions() {
      this.userPermissions = this.user.permissions
    },

    hasPermissionTo(permissionName) {
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
