<script setup >
import { ref } from "vue"
import { useCurrentUserStore } from "@/store/currentUser"
import { detect } from 'detect-browser'
import { useRouter } from 'vue-router'

const currentUser = useCurrentUserStore()
const email = ref('')
const password = ref('')
const router = useRouter()
const showMessage = ref(false)
const alertMessage = ref('')

const login = async () => {
  const browser = detect()
  const device = browser ? `${browser.name} ${browser.version}` : 'unknown'
  const response = await currentUser.login(email.value, password.value, device);

  switch (response.status) {
    case 200:
      router.push({ name: 'MainDashboard' })
      break
    case 422:
      showMessage.value = true
      alertMessage.value = response.response?.data?.message ?? 'Invalid Credentials'
      break
    case 403:
      showMessage.value = true
      alertMessage.value = 'Access Denied'
      break
    default:
      showMessage.value = true
      alertMessage.value = 'Invalid Response'
  }
}
</script>

<template>
  <v-card class="mx-auto" width="85%" max-width="350">
    <v-card-text>
      <v-text-field v-model="email" label="Email" />
      <v-text-field v-model="password" label="Password" type="password" @keyup.enter="login()"/>

      <transition name="bounce">
        <v-alert
          v-model="showMessage"
          density="compact"
          type="warning"
          :text="alertMessage"
          closeable
        />
      </transition>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" class="primary-color">Forgot Password</v-btn>
      <v-spacer />
      <v-btn variant="tonal" @click="login()">Login</v-btn>
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.primary-color {
  color: #09203f;
}
</style>
