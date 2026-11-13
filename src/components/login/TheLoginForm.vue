<script setup lang="ts">
import { ref } from "vue"
import { useCurrentUserStore } from "@/store/currentUser"
import { detect } from 'detect-browser'
import { useRouter } from 'vue-router'

const currentUser = useCurrentUserStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const router = useRouter()
const alertMessage = ref('')

const login = async () => {
  if (loading.value) return
  if (!email.value.trim() || !password.value) {
    alertMessage.value = 'Escribe tu correo y tu contraseña.'
    return
  }
  loading.value = true
  alertMessage.value = ''
  try {
    const browser = detect()
    const device = browser ? `${browser.name} ${browser.version}` : 'unknown'
    const response = (await currentUser.login(email.value.trim(), password.value, device)) as { status?: number }

    switch (response.status) {
      case 200:
        router.push({ name: 'MainDashboard' })
        break
      case 422:
        alertMessage.value = 'El correo o la contraseña no coinciden.'
        break
      case 403:
        alertMessage.value = 'Esta cuenta no tiene acceso al panel.'
        break
      case 429:
        alertMessage.value = 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
        break
      default:
        alertMessage.value = 'No pudimos entrar. Inténtalo de nuevo.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form novalidate @submit.prevent="login">
    <v-text-field
      v-model="email"
      label="Correo"
      type="email"
      autocomplete="username"
      inputmode="email"
      prepend-inner-icon="mdi-email-outline"
      @update:model-value="alertMessage = ''"
    />
    <v-text-field
      v-model="password"
      label="Contraseña"
      :type="showPassword ? 'text' : 'password'"
      autocomplete="current-password"
      prepend-inner-icon="mdi-lock-outline"
      :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
      @click:append-inner="showPassword = !showPassword"
      @update:model-value="alertMessage = ''"
    />

    <div aria-live="polite">
      <v-alert v-if="alertMessage" type="error" variant="tonal" density="compact" class="mb-4" :text="alertMessage" />
    </div>

    <v-btn type="submit" color="primary" size="large" block :loading="loading">Entrar</v-btn>
  </form>
</template>
