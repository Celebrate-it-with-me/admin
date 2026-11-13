<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { moduleLabel } from '../labels'
import { EXPIRY_OPTIONS, expiryFor, toDateInput, type ExpiryChoice, type ModuleState } from './logic'

/** Gift (activate) or block a module for this event: expiry + reason. */
const props = defineProps<{ modelValue: boolean; moduleKey: string; mode: ModuleState; loading: boolean; error: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [{ expiresAt: string | null; reason: string }] }>()

const choice = ref<ExpiryChoice>('30')
const date = ref('')
const tomorrow = computed(() => toDateInput(new Date(Date.now() + 86_400_000)))

watch(() => props.modelValue, open => { if (open) { choice.value = props.mode === 'active' ? '30' : 'none'; date.value = '' } })

const expiry = computed(() => expiryFor(choice.value, date.value))
const dateError = computed(() => choice.value === 'date' && expiry.value === undefined)

const title = computed(() => `${props.mode === 'active' ? 'Regalar' : 'Bloquear'} ${moduleLabel(props.moduleKey)}`)
const message = computed(() => props.mode === 'active'
  ? 'La organizadora podrá usar este módulo aunque su plan no lo incluya.'
  : 'La organizadora dejará de poder usar este módulo aunque su plan lo incluya.')

const confirm = (reason: string) => {
  if (expiry.value === undefined) return
  emit('confirm', { expiresAt: expiry.value, reason })
}
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    :title="title"
    :message="message"
    :confirm-label="mode === 'active' ? 'Regalar' : 'Bloquear'"
    :danger="mode === 'locked'"
    :loading="loading"
    :error="error"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="confirm"
  >
    <v-select v-model="choice" :items="EXPIRY_OPTIONS" item-title="title" item-value="value" label="Vencimiento" class="mb-2" />
    <v-text-field
      v-if="choice === 'date'"
      v-model="date"
      type="date"
      label="Vence el (fin del día)"
      :min="tomorrow"
      :error="dateError"
      :hint="dateError ? 'Elige una fecha futura.' : ''"
      persistent-hint
      class="mb-2"
    />
  </ReasonDialog>
</template>
