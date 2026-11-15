<script setup lang="ts">
import { ref, watch } from 'vue'

/** Asks the current password and a 2FA code (authenticator or recovery) before turning two-step verification off. The parent runs the action and passes the errors back. */
const props = withDefaults(defineProps<{
  modelValue: boolean
  loading?: boolean
  error?: string
  passwordError?: string
  codeError?: string
}>(), { loading: false, error: '', passwordError: '', codeError: '' })
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [{ password: string; code: string }] }>()

const password = ref('')
const code = ref('')
const show = ref(false)
const touched = ref(false)

watch(() => props.modelValue, open => { if (open) { password.value = ''; code.value = ''; show.value = false; touched.value = false } })

const close = () => { if (!props.loading) emit('update:modelValue', false) }
const submit = () => {
  touched.value = true
  const c = code.value.trim()
  if (password.value && c && !props.loading) emit('confirm', { password: password.value, code: c })
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="460" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">Desactivar los dos pasos</v-card-title>
      <form novalidate @submit.prevent="submit">
        <v-card-text>
          <p class="mb-4 text-medium-emphasis">Tu cuenta volverá a pedir solo la contraseña y cerraremos tus otras sesiones.</p>
          <v-text-field
            v-model="password"
            label="Tu contraseña actual"
            :type="show ? 'text' : 'password'"
            autocomplete="current-password"
            autofocus
            :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error-messages="touched && !password ? 'Escribe tu contraseña.' : passwordError"
            @click:append-inner="show = !show"
          />
          <v-text-field
            v-model="code"
            label="Código"
            autocomplete="one-time-code"
            inputmode="text"
            hint="Código de tu app autenticadora o un código de recuperación"
            persistent-hint
            :error-messages="touched && !code.trim() ? 'Escribe el código.' : codeError"
          />
          <div aria-live="polite" class="mt-4">
            <v-alert v-if="error" type="error" variant="tonal" density="compact" :text="error" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="touch" :disabled="loading" @click="close">Cancelar</v-btn>
          <v-btn color="error" variant="flat" class="touch" type="submit" :loading="loading">Desactivar</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.touch { min-height: 44px; }
</style>
