<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API } from '@/services/axios'
import { reauthCancelled, reauthDone, reauthState } from '@/services/reauth'

/**
 * "Confirm it's you": password, plus the code of the authenticator app when the account has two-factor. Mounted once
 * in App.vue; opened by the axios interceptor when the API asks for a recent re-authentication.
 */
const password = ref('')
const code = ref('')
const show = ref(false)
const needsCode = ref(false)
const minutes = ref(10)
const loading = ref(false)
const error = ref('')
const touched = ref(false)

const open = computed(() => reauthState.open)

watch(open, async isOpen => {
  if (!isOpen) return
  password.value = ''
  code.value = ''
  show.value = false
  error.value = ''
  touched.value = false
  loading.value = false
  try {
    const { data } = (await API.get('account/reauth')).data
    needsCode.value = !!data.needsCode
    minutes.value = data.minutes ?? 10
  } catch { /* the POST will say what is needed */ }
})

const cleanCode = computed(() => code.value.replace(/\s+/g, ''))
const ready = computed(() => password.value !== '' && (!needsCode.value || /^\d{6}$/.test(cleanCode.value)))

const cancel = () => { if (!loading.value) reauthCancelled() }

const submit = async () => {
  touched.value = true
  if (!ready.value || loading.value) return
  loading.value = true
  error.value = ''
  try {
    await API.post('account/reauth', { password: password.value, code: needsCode.value ? cleanCode.value : undefined })
    reauthDone()
  } catch (e) {
    const err = e as { response?: { status?: number; data?: { errors?: Record<string, string[]>; code?: string } } }
    const status = err.response?.status
    const errors = err.response?.data?.errors ?? {}
    if (status === 429) error.value = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    else if (errors.code) { needsCode.value = true; error.value = errors.code[0] }
    else if (errors.password) error.value = errors.password[0]
    else if (err.response?.data?.code === 'token_required') error.value = 'Vuelve a iniciar sesión para confirmar tu identidad.'
    else error.value = 'No pudimos confirmarlo. Inténtalo de nuevo.'
    code.value = ''
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog :model-value="open" max-width="460" persistent @keydown.esc="cancel">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">Confirma que eres tú</v-card-title>
      <form novalidate @submit.prevent="submit">
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">
            Esta acción es delicada. Escribe tu contraseña{{ needsCode ? ' y el código de tu aplicación de autenticación' : '' }}; no te lo volveremos a pedir durante {{ minutes }} minutos.
          </p>
          <v-text-field
            v-model="password"
            label="Tu contraseña"
            :type="show ? 'text' : 'password'"
            autocomplete="current-password"
            autofocus
            :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error-messages="touched && !password ? 'Escribe tu contraseña.' : ''"
            @click:append-inner="show = !show"
          />
          <v-text-field
            v-if="needsCode"
            v-model="code"
            label="Código de 6 dígitos"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="7"
            :error-messages="touched && !/^\d{6}$/.test(cleanCode) ? 'Escribe los 6 dígitos.' : ''"
            :hint="'Si acabas de entrar con este mismo código, espera al siguiente.'"
            persistent-hint
          />
          <div aria-live="polite">
            <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" :text="error" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="touch" :disabled="loading" @click="cancel">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" class="touch" type="submit" :loading="loading">Confirmar</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.touch { min-height: 44px; }
</style>
