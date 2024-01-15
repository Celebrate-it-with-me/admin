// Utilities
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', ()=> {
  const appVersion = ref(import.meta.env.PACKAGE_VERSION)
  const navigationDrawer = ref(true)
  const developmentMode = ref(import.meta.env.DEV)

  return { appVersion, navigationDrawer, developmentMode }
})
