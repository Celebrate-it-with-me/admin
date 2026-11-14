<script setup lang="ts">
import { ref, watch } from 'vue'

/** Re-asks the current password before a sensitive action. The parent runs the action and passes `error` back. */
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message?: string
  confirmLabel: string
  loading?: boolean
  error?: string
  danger?: boolean
}>(), { message: '', loading: false, error: '', danger: false })
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [string] }>()

const password = ref('')
const show = ref(false)
const touched = ref(false)

watch(() => props.modelValue, open => { if (open) { password.value = ''; show.value = false; touched.value = false } })

const close = () => { if (!props.loading) emit('update:modelValue', false) }
const submit = () => {
  touched.value = true
  if (password.value && !props.loading) emit('confirm', password.value)
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="460" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">{{ title }}</v-card-title>
      <form novalidate @submit.prevent="submit">
        <v-card-text>
          <p v-if="message" class="mb-4 text-medium-emphasis">{{ message }}</p>
          <v-text-field
            v-model="password"
            label="Tu contraseña actual"
            :type="show ? 'text' : 'password'"
            autocomplete="current-password"
            autofocus
            :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error-messages="touched && !password ? 'Escribe tu contraseña.' : ''"
            @click:append-inner="show = !show"
          />
          <div aria-live="polite">
            <v-alert v-if="error" type="error" variant="tonal" density="compact" :text="error" />
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" class="touch" :disabled="loading" @click="close">Cancelar</v-btn>
          <v-btn :color="danger ? 'error' : 'primary'" variant="flat" class="touch" type="submit" :loading="loading">{{ confirmLabel }}</v-btn>
        </v-card-actions>
      </form>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.touch { min-height: 44px; }
</style>
