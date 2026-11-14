<script setup lang="ts">
/** A plain yes/no for destructive account actions that do not need a typed reason (the account is her own). */
defineProps<{
  modelValue: boolean
  title: string
  message: string
  confirmLabel: string
  loading?: boolean
  error?: string
  danger?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [] }>()
const close = () => emit('update:modelValue', false)
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="460" persistent @update:model-value="close" @keydown.esc="close">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">{{ title }}</v-card-title>
      <v-card-text>
        <p class="text-medium-emphasis">{{ message }}</p>
        <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" :text="error" />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" class="touch" :disabled="loading" autofocus @click="close">Cancelar</v-btn>
        <v-btn :color="danger ? 'error' : 'primary'" variant="flat" class="touch" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.touch { min-height: 44px; }
</style>
