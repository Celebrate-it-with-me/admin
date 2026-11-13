<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { fetchPlanImpact, savePlan } from '../services/catalogApi'
import { explainError, guestLimit, parseGuestLimit, planChanges, planImpactText } from '../logic'
import type { CatalogPlan, PlanImpact, PlanUpdateResult } from '../types'

// Edits name, description and guest limit of one plan. The impact of the new limit is shown before saving; the API
// never blocks anyone with it (events above the limit only cannot add guests or publish).
const props = defineProps<{ plan: CatalogPlan | null }>()
const emit = defineEmits<{ close: []; saved: [PlanUpdateResult] }>()

const open = computed({ get: () => props.plan !== null, set: v => { if (!v) emit('close') } })

const name = ref('')
const description = ref('')
const unlimited = ref(false)
const limitText = ref('')

const impact = ref<PlanImpact | null>(null)
const impactLoading = ref(false)
const impactError = ref('')
const saving = ref(false)
const error = ref('')
const limitServerError = ref('')

let timer: ReturnType<typeof setTimeout> | undefined
let seq = 0
onBeforeUnmount(() => clearTimeout(timer))

const parsed = computed(() => (unlimited.value ? { value: 0 } : parseGuestLimit(limitText.value)))
const limitValue = computed(() => ('value' in parsed.value ? parsed.value.value : null))
const limitError = computed(() => limitServerError.value || (!unlimited.value && limitText.value !== '' && 'error' in parsed.value ? parsed.value.error : ''))
const nameError = computed(() => (name.value.trim() === '' ? 'El plan necesita un nombre.' : name.value.trim().length > 100 ? 'Máximo 100 caracteres.' : ''))
const descriptionError = computed(() => (description.value.length > 500 ? 'Máximo 500 caracteres.' : ''))

const changes = computed(() => (props.plan && limitValue.value != null
  ? planChanges(props.plan, { maxGuests: limitValue.value, name: name.value, description: description.value })
  : {}))
const hasChanges = computed(() => Object.keys(changes.value).length > 0)
const limitChanged = computed(() => changes.value.maxGuests !== undefined)
const valid = computed(() => limitValue.value != null && !nameError.value && !descriptionError.value)
const ready = computed(() => valid.value && hasChanges.value && !(limitChanged.value && (impactLoading.value || !impact.value)))

const loadImpact = async () => {
  const p = props.plan
  const v = limitValue.value
  if (!p || v == null || !limitChanged.value) return
  const mine = ++seq
  impactLoading.value = true
  impactError.value = ''
  try {
    const r = await fetchPlanImpact(p.slug, v)
    if (mine === seq) impact.value = r
  } catch (e) {
    if (mine === seq) { impact.value = null; impactError.value = explainError(e) }
  } finally {
    if (mine === seq) impactLoading.value = false
  }
}

watch(() => props.plan, p => {
  clearTimeout(timer)
  seq++
  impact.value = null
  impactError.value = ''
  impactLoading.value = false
  error.value = ''
  limitServerError.value = ''
  name.value = p?.name ?? ''
  description.value = p?.description ?? ''
  const l = p ? guestLimit(p) : null
  unlimited.value = p ? l == null : false
  limitText.value = l == null ? '' : String(l)
}, { immediate: true })

// The impact is asked for after a short pause once the typed limit is valid and differs from the current one.
watch([limitValue, limitChanged], () => {
  clearTimeout(timer)
  seq++
  impact.value = null
  impactError.value = ''
  limitServerError.value = ''
  impactLoading.value = false
  if (props.plan && limitValue.value != null && limitChanged.value) {
    impactLoading.value = true
    timer = setTimeout(loadImpact, 350)
  }
})

const confirm = async (reason: string) => {
  const p = props.plan
  if (!p || !ready.value) return
  saving.value = true
  error.value = ''
  limitServerError.value = ''
  try {
    emit('saved', await savePlan(p.slug, { ...changes.value, reason }))
  } catch (e) {
    const data = (e as { response?: { status?: number; data?: { errors?: Record<string, string[]> } } }).response
    const fieldMessage = data?.status === 422 ? data.data?.errors?.maxGuests?.[0] : undefined
    if (fieldMessage) limitServerError.value = fieldMessage
    else error.value = explainError(e)
  } finally { saving.value = false }
}

const limitSummary = computed(() => {
  if (!props.plan || !limitChanged.value) return ''
  return unlimited.value ? 'sin límite de invitados' : `${limitValue.value} invitados`
})
</script>

<template>
  <ReasonDialog
    v-model="open"
    :title="plan ? `Editar plan ${plan.name}` : 'Editar plan'"
    confirm-label="Guardar plan"
    :loading="saving"
    :error="error"
    :confirm-disabled="!ready"
    @confirm="confirm"
  >
    <v-text-field
      v-model="name"
      label="Nombre del plan"
      density="comfortable"
      maxlength="100"
      autocomplete="off"
      :error-messages="nameError"
      class="mb-1"
    />
    <v-textarea
      v-model="description"
      label="Descripción"
      rows="2"
      auto-grow
      maxlength="500"
      counter="500"
      :error-messages="descriptionError"
      class="mb-1"
    />

    <div class="limit">
      <v-text-field
        v-model="limitText"
        label="Límite de invitados"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        density="comfortable"
        :disabled="unlimited"
        :error-messages="limitError"
        :hint="unlimited ? 'Sin límite' : 'De 1 a 100.000 invitados por evento'"
        persistent-hint
        class="limit-field"
      />
      <v-checkbox v-model="unlimited" label="Ilimitado" density="compact" hide-details class="limit-unlimited" />
    </div>

    <div class="impact mt-3 mb-2" aria-live="polite">
      <div v-if="impactLoading" class="d-flex align-center ga-2" role="status">
        <v-progress-circular indeterminate size="18" width="2" /> Calculando el impacto…
      </div>
      <v-alert v-else-if="impactError" type="error" variant="tonal" density="compact" :text="impactError">
        <template #append><v-btn size="small" variant="text" @click="loadImpact">Reintentar</v-btn></template>
      </v-alert>
      <v-alert v-else-if="impact && !limitServerError" :type="impact.eventsOverNewLimit > 0 ? 'warning' : 'info'" variant="tonal" density="compact">
        <strong>{{ plan?.name }} con {{ limitSummary }}.</strong>
        {{ planImpactText(impact.eventsOverNewLimit, impact.eventsNowOver) }}
      </v-alert>
      <p v-else-if="!limitChanged && valid" class="text-caption text-medium-emphasis">El límite no cambia; solo se guardan el nombre o la descripción.</p>
    </div>
  </ReasonDialog>
</template>

<style scoped>
.limit { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.limit-field { flex: 1 1 200px; min-width: 0; }
.limit-unlimited { flex: none; margin-top: 4px; }
.limit-unlimited :deep(.v-selection-control) { min-height: 44px; }
</style>
