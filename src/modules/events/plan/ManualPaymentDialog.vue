<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { dollarsToCents } from './planLogic'

const props = defineProps<{ modelValue: boolean; loading: boolean; error: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [{ amountCents: number; notes: string; reason: string }] }>()

const amount = ref('')
const notes = ref('')
const touched = ref(false)
watch(() => props.modelValue, open => { if (open) { amount.value = ''; notes.value = ''; touched.value = false } })

const cents = computed(() => dollarsToCents(amount.value))
const amountError = computed(() => (touched.value && cents.value == null ? 'Escribe el importe en dólares, por ejemplo 79 o 79.50.' : ''))
const localError = computed(() => props.error)

const onConfirm = (reason: string) => {
  touched.value = true
  if (cents.value == null) return
  emit('confirm', { amountCents: cents.value, notes: notes.value.trim(), reason })
}
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    title="Marcar pagado a mano"
    message="Úsalo cuando el pago llegó por fuera de la pasarela (por ejemplo, Zelle). El evento pasa al plan completo."
    confirm-label="Marcar pagado"
    :loading="loading"
    :error="localError"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="onConfirm"
  >
    <v-text-field v-model="amount" label="Importe cobrado (USD)" prefix="$" inputmode="decimal" :error-messages="amountError" @blur="touched = true" />
    <v-text-field v-model="notes" label="Notas (opcional)" placeholder="Zelle, confirmación del banco…" maxlength="500" />
  </ReasonDialog>
</template>
