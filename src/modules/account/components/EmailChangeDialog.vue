<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { requestEmailChange } from '../services/accountApi'
import { parseApiError } from '../logic'
import type { AccountProfile } from '../types'

const props = defineProps<{ modelValue: boolean; currentEmail: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; saved: [AccountProfile] }>()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const loading = ref(false)
const touched = ref(false)
const errors = ref<{ email?: string; password?: string; general?: string }>({})

watch(() => props.modelValue, open => {
  if (!open) return
  email.value = ''; password.value = ''; showPassword.value = false; touched.value = false; errors.value = {}
})

const emailOk = computed(() => /^\S+@\S+\.\S+$/.test(email.value.trim()))
const sameAsCurrent = computed(() => email.value.trim().toLowerCase() === props.currentEmail.toLowerCase())

const close = () => { if (!loading.value) emit('update:modelValue', false) }
const submit = async () => {
  touched.value = true
  if (!emailOk.value || sameAsCurrent.value || !password.value || loading.value) return
  loading.value = true
  errors.value = {}
  try {
    emit('saved', await requestEmailChange(email.value.trim(), password.value))
  } catch (e) {
    const err = parseApiError(e)
    errors.value = { email: err.fields.email, password: err.fields.password, general: err.fields.email || err.fields.password ? undefined : err.message }
  } finally { loading.value = false }
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">Cambiar mi correo</v-card-title>
      <form novalidate @submit.prevent="submit">
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">Te enviaremos un enlace al correo nuevo. Tu correo no cambia hasta que lo abras.</p>
          <v-text-field
            v-model="email" label="Correo nuevo" type="email" inputmode="email" autocomplete="off" autofocus
            :error-messages="errors.email || (touched && !emailOk ? 'Escribe un correo válido.' : touched && sameAsCurrent ? 'Ese ya es tu correo.' : '')"
          />
          <v-text-field
            v-model="password" label="Tu contraseña actual" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
            :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error-messages="errors.password || (touched && !password ? 'Escribe tu contraseña.' : '')"
            @click:append-inner="showPassword = !showPassword"
          />
          <div aria-live="polite">
            <v-alert v-if="errors.general" type="error" variant="tonal" density="compact" :text="errors.general" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="touch" :disabled="loading" @click="close">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" class="touch" type="submit" :loading="loading">Enviar enlace</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.touch { min-height: 44px; }
</style>
