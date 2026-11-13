<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { PLAN_OPTIONS } from './planLogic'

const props = defineProps<{ modelValue: boolean; loading: boolean; error: string; currentSlug: string | null; guests: number }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [{ planSlug: string; reason: string }] }>()

const choice = ref<string | null>(null)
const touched = ref(false)
watch(() => props.modelValue, open => { if (open) { choice.value = null; touched.value = false } })

const options = computed(() => PLAN_OPTIONS.filter(p => p.slug !== props.currentSlug).map(p => ({ value: p.slug, title: `${p.name} · ${p.limit ?? 'sin límite de'} invitados` })))
const target = computed(() => PLAN_OPTIONS.find(p => p.slug === choice.value) ?? null)
const overLimit = computed(() => Boolean(target.value && target.value.limit != null && props.guests > target.value.limit))

const onConfirm = (reason: string) => {
  touched.value = true
  if (choice.value) emit('confirm', { planSlug: choice.value, reason })
}
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    title="Cambiar el plan"
    message="El cambio no cobra ni reembolsa nada: solo cambia el plan y sus límites."
    confirm-label="Cambiar plan"
    :loading="loading"
    :error="error"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="onConfirm"
  >
    <v-select v-model="choice" :items="options" item-title="title" item-value="value" label="Nuevo plan" :error-messages="touched && !choice ? 'Elige un plan.' : ''" />
    <v-alert type="warning" variant="tonal" density="compact" class="mb-4" icon="mdi-alert-outline">
      <p>No se borra ningún invitado. Si hay más invitados que el límite del nuevo plan, no se podrá publicar ni agregar más hasta resolverlo, y las funciones que el plan no incluya se bloquean.</p>
      <p v-if="overLimit" class="mt-2"><strong>Este evento tiene {{ guests }} invitados y el nuevo plan permite {{ target!.limit }}.</strong></p>
    </v-alert>
  </ReasonDialog>
</template>
