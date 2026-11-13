<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
// Plans and their guest limits come from the catalog (A4), not from a fixed list.
import { fetchCatalog } from '@/modules/catalog/services/catalogApi'
import { planOptions } from '@/modules/catalog/logic'
import type { PlanOption } from './types'

const props = defineProps<{ modelValue: boolean; loading: boolean; error: string; currentSlug: string | null; guests: number }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [{ planSlug: string; reason: string }] }>()

const choice = ref<string | null>(null)
const touched = ref(false)
const plans = ref<PlanOption[]>([])
const plansLoading = ref(false)
const plansError = ref('')
const loadPlans = async () => {
  plansLoading.value = true
  plansError.value = ''
  try { plans.value = planOptions(await fetchCatalog()) } catch { plansError.value = 'No pudimos cargar los planes.' } finally { plansLoading.value = false }
}
watch(() => props.modelValue, open => { if (open) { choice.value = null; touched.value = false; loadPlans() } })

const options = computed(() => plans.value.filter(p => p.slug !== props.currentSlug).map(p => ({ value: p.slug, title: `${p.name} · ${p.limit ?? 'sin límite de'} invitados` })))
const target = computed(() => plans.value.find(p => p.slug === choice.value) ?? null)
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
    <v-alert v-if="plansError" type="error" variant="tonal" density="compact" class="mb-4" :text="plansError">
      <template #append><v-btn size="small" variant="text" @click="loadPlans">Reintentar</v-btn></template>
    </v-alert>
    <v-select v-model="choice" :items="options" item-title="title" item-value="value" label="Nuevo plan" :loading="plansLoading" :error-messages="touched && !choice ? 'Elige un plan.' : ''" />
    <v-alert type="warning" variant="tonal" density="compact" class="mb-4" icon="mdi-alert-outline">
      <p>No se borra ningún invitado. Si hay más invitados que el límite del nuevo plan, no se podrá publicar ni agregar más hasta resolverlo, y las funciones que el plan no incluya se bloquean.</p>
      <p v-if="overLimit" class="mt-2"><strong>Este evento tiene {{ guests }} invitados y el nuevo plan permite {{ target!.limit }}.</strong></p>
    </v-alert>
  </ReasonDialog>
</template>
