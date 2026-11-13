<script setup lang="ts">
import { computed, ref, watch } from 'vue'

/**
 * Asks for the reason of a sensitive action (the API requires it and writes it in the audit log).
 * Put extra fields in the default slot; `error` shows what the server said.
 */
const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  message?: string
  confirmLabel?: string
  loading?: boolean
  error?: string
  /** The confirm button is red (deleting, removing access). */
  danger?: boolean
  /** The confirm button stays off until the extra fields in the slot are ready. */
  confirmDisabled?: boolean
}>(), { confirmLabel: 'Confirmar', loading: false, error: '', danger: false, message: '', confirmDisabled: false })

const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [string] }>()

const MIN = 5
const reason = ref('')
const touched = ref(false)

watch(() => props.modelValue, open => { if (open) { reason.value = ''; touched.value = false } })

const trimmed = computed(() => reason.value.trim())
const valid = computed(() => trimmed.value.length >= MIN)
const hint = computed(() => (touched.value && !valid.value ? `Escribe al menos ${MIN} caracteres.` : 'Queda registrado en la auditoría.'))

const close = () => emit('update:modelValue', false)
const submit = () => {
  touched.value = true
  if (valid.value && !props.loading) emit('confirm', trimmed.value)
}
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="480" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">{{ title }}</v-card-title>
      <v-card-text>
        <p v-if="message" class="mb-4 text-medium-emphasis">{{ message }}</p>
        <slot />
        <v-textarea
          v-model="reason"
          label="Motivo"
          rows="3"
          auto-grow
          counter="500"
          maxlength="500"
          :error="touched && !valid"
          :hint="hint"
          persistent-hint
          autofocus
          @blur="touched = true"
        />
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" :text="error" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="close">Cancelar</v-btn>
        <v-btn :color="danger ? 'error' : 'primary'" variant="flat" :loading="loading" :disabled="confirmDisabled" @click="submit">{{ confirmLabel }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
</style>
