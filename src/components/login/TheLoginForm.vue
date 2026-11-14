<script setup lang="ts">
import { computed, nextTick, ref } from "vue"
import { useCurrentUserStore } from "@/store/currentUser"
import { detect } from 'detect-browser'
import { useRoute, useRouter } from 'vue-router'

const currentUser = useCurrentUserStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const router = useRouter()
const route = useRoute()
const alertMessage = ref('')
// The server closed the session (idle too long, or older than the maximum): the interceptor sends her here with ?expired=1.
const expiredNotice = route.query.expired ? 'Tu sesión venció por seguridad. Entra de nuevo para continuar.' : ''

// Second step (only when the account has two-factor on): the server hands back a challenge to answer with a code.
const challenge = ref('')
const code = ref('')
const useRecovery = ref(false)
const codeField = ref<{ focus?: () => void } | null>(null)

const device = () => {
  const browser = detect()
  return browser ? `${browser.name} ${browser.version}` : 'unknown'
}

/** Back to where the person was going (a link from a mail), but only inside the panel. */
const enter = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  router.push(redirect.startsWith('/dashboard') ? redirect : { name: 'MainDashboard' })
}

const secondStepTitle = computed(() => (useRecovery.value ? 'Código de recuperación' : 'Código de verificación'))

const login = async () => {
  if (loading.value) return
  if (!email.value.trim() || !password.value) {
    alertMessage.value = 'Escribe tu correo y tu contraseña.'
    return
  }
  loading.value = true
  alertMessage.value = ''
  try {
    const response = (await currentUser.login(email.value.trim(), password.value, device())) as { status?: number; data?: { twoFactorRequired?: boolean; challenge?: string } }

    if (response.status === 200 && response.data?.twoFactorRequired && response.data.challenge) {
      challenge.value = response.data.challenge
      password.value = ''
      await nextTick()
      codeField.value?.focus?.()
      return
    }

    switch (response.status) {
      case 200:
        enter()
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

const verify = async () => {
  if (loading.value) return
  const value = code.value.trim()
  if (!value) {
    alertMessage.value = useRecovery.value ? 'Escribe uno de tus códigos de recuperación.' : 'Escribe el código de 6 dígitos.'
    return
  }
  loading.value = true
  alertMessage.value = ''
  try {
    const secret = useRecovery.value ? { recoveryCode: value } : { code: value.replace(/\s+/g, '') }
    const response = (await currentUser.completeTwoFactor(challenge.value, secret, device())) as {
      status?: number
      response?: { status?: number; data?: { errors?: Record<string, string[]> } }
    }
    if (response.status === 200) {
      enter()
      return
    }
    const status = response.response?.status
    const errors = response.response?.data?.errors ?? {}
    if (status === 422 && errors.challenge) {
      // The attempt expired or ran out of tries: back to the password.
      reset()
      alertMessage.value = 'El intento venció o hubo demasiados códigos incorrectos. Entra de nuevo.'
    } else if (status === 422) {
      alertMessage.value = useRecovery.value ? 'Ese código de recuperación no es válido o ya se usó.' : 'El código no es correcto. Revisa que la hora de tu teléfono esté en automático.'
    } else if (status === 429) {
      alertMessage.value = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    } else {
      alertMessage.value = 'No pudimos verificar el código. Inténtalo de nuevo.'
    }
  } finally {
    loading.value = false
  }
}

const reset = () => {
  challenge.value = ''
  code.value = ''
  useRecovery.value = false
  alertMessage.value = ''
}

const toggleRecovery = async () => {
  useRecovery.value = !useRecovery.value
  code.value = ''
  alertMessage.value = ''
  await nextTick()
  codeField.value?.focus?.()
}
</script>

<template>
  <form v-if="!challenge" novalidate @submit.prevent="login">
    <v-alert v-if="expiredNotice" type="info" variant="tonal" density="compact" class="mb-4" role="status" :text="expiredNotice" />
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

  <form v-else novalidate @submit.prevent="verify">
    <p class="mb-4 text-medium-emphasis">
      {{ useRecovery ? 'Escribe uno de los códigos de recuperación que guardaste. Cada uno sirve una sola vez.' : 'Abre tu aplicación de autenticación y escribe el código de 6 dígitos de Quinvite.' }}
    </p>
    <v-text-field
      ref="codeField"
      v-model="code"
      :label="secondStepTitle"
      :inputmode="useRecovery ? 'text' : 'numeric'"
      autocomplete="one-time-code"
      :maxlength="useRecovery ? 14 : 7"
      prepend-inner-icon="mdi-shield-key-outline"
      autofocus
      @update:model-value="alertMessage = ''"
    />

    <div aria-live="polite">
      <v-alert v-if="alertMessage" type="error" variant="tonal" density="compact" class="mb-4" :text="alertMessage" />
    </div>

    <v-btn type="submit" color="primary" size="large" block :loading="loading">Verificar</v-btn>
    <div class="second-links">
      <v-btn variant="text" class="link-btn" @click="toggleRecovery">{{ useRecovery ? 'Usar el código de mi aplicación' : 'Usar un código de recuperación' }}</v-btn>
      <v-btn variant="text" class="link-btn" :disabled="loading" @click="reset">Volver</v-btn>
    </div>
  </form>
</template>

<style scoped>
.second-links { display: flex; flex-direction: column; align-items: flex-start; margin-top: 12px; }
.link-btn { min-height: 44px; padding-inline: 8px; }
</style>
