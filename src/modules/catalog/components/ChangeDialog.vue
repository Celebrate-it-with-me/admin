<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { fetchImpact, saveModuleEnabled, saveModulePlans } from '../services/catalogApi'
import {
  confirmMatches, eventsLabel, explainError, moduleLabel, needsTypedConfirm, plansResultText, removedSlugs, toggleResultText,
} from '../logic'
import type { CatalogPlan, Impact, ImpactPlanRow, PendingChange } from '../types'

// The change is only a proposal until the person confirms: this dialog checks the impact, asks the reason and saves.
const props = defineProps<{ change: PendingChange | null; plans: CatalogPlan[] }>()
const emit = defineEmits<{ close: []; saved: [string] }>()

const open = computed({ get: () => props.change !== null, set: v => { if (!v) emit('close') } })

const impact = ref<Impact | null>(null)
const impactLoading = ref(false)
const impactError = ref('')
const keepForExisting = ref(true)
const typed = ref('')
const saving = ref(false)
const error = ref('')

const key = computed(() => props.change?.module.key ?? '')
const label = computed(() => (key.value ? moduleLabel(key.value) : ''))
const isPlans = computed(() => props.change?.kind === 'plans')
const removed = computed(() => (props.change ? removedSlugs(props.change) : []))
const removes = computed(() => removed.value.length > 0)
const nameOf = (slug: string) => props.plans.find(p => p.slug === slug)?.name ?? slug

const rowText = (p: ImpactPlanRow): string => {
  const n = p.change === 'removed' ? p.toLocked : p.toActive
  const verb = n === 1 ? 'pasaría' : 'pasarían'
  const base = `${n} ${verb} a ${p.change === 'removed' ? 'bloqueado' : 'activo'}`
  const kept = p.withOverride > 0 ? `; ${p.withOverride} ${p.withOverride === 1 ? 'tiene' : 'tienen'} una excepción y no cambian` : ''
  return `${base}${kept}.`
}

const loadImpact = async () => {
  const c = props.change
  if (!c || c.kind !== 'plans') return
  impactLoading.value = true
  impactError.value = ''
  impact.value = null
  try { impact.value = await fetchImpact(c.module.key, c.planSlugs, props.plans.map(p => p.slug), c.module.planSlugs) } catch (e) { impactError.value = explainError(e) } finally { impactLoading.value = false }
}

watch(() => props.change, c => {
  keepForExisting.value = true
  typed.value = ''
  error.value = ''
  impact.value = null
  impactError.value = ''
  if (c?.kind === 'plans') loadImpact()
})

const typedRequired = computed(() =>
  props.change ? needsTypedConfirm(props.change, props.plans, impact.value, keepForExisting.value && removes.value) : false)
const typedOk = computed(() => !typedRequired.value || confirmMatches(typed.value, key.value))
const ready = computed(() => (isPlans.value ? Boolean(impact.value) : true) && typedOk.value)

const title = computed(() => {
  const c = props.change
  if (!c) return ''
  if (c.kind === 'toggle') return c.isEnabled ? `Encender ${label.value}` : `Apagar ${label.value}`
  return `Cambiar los planes de ${label.value}`
})
const confirmLabel = computed(() => (props.change?.kind === 'toggle' ? (props.change.isEnabled ? 'Encender' : 'Apagar') : 'Guardar cambio'))
const overridesNow = computed(() => (props.change ? props.change.module.overrides.active + props.change.module.overrides.locked : 0))

const toggleText = computed(() => {
  const c = props.change
  if (!c || c.kind !== 'toggle') return ''
  return c.isEnabled
    ? 'El módulo vuelve a estar disponible según el plan de cada evento.'
    : 'El módulo deja de estar disponible para todos los eventos, aunque su plan lo incluya.'
})

const confirm = async (reason: string) => {
  const c = props.change
  if (!c || !ready.value) return
  saving.value = true
  error.value = ''
  try {
    if (c.kind === 'plans') {
      const r = await saveModulePlans(c.module.key, { planSlugs: c.planSlugs, reason, keepForExisting: removes.value ? keepForExisting.value : true })
      emit('saved', plansResultText(c.module.key, r))
    } else {
      const r = await saveModuleEnabled(c.module.key, { isEnabled: c.isEnabled, reason })
      emit('saved', toggleResultText(c.module.key, c.isEnabled, r))
    }
  } catch (e) { error.value = explainError(e) } finally { saving.value = false }
}
</script>

<template>
  <ReasonDialog
    v-model="open"
    :title="title"
    :confirm-label="confirmLabel"
    :loading="saving"
    :error="error"
    :danger="typedRequired || (change?.kind === 'toggle' && !change.isEnabled)"
    :confirm-disabled="!ready"
    @confirm="confirm"
  >
    <div class="impact" aria-live="polite">
      <template v-if="change?.kind === 'toggle'">
        <p class="mb-2">{{ toggleText }}</p>
        <p v-if="!change.isEnabled && overridesNow > 0" class="text-medium-emphasis mb-2">
          Hoy hay {{ overridesNow }} {{ overridesNow === 1 ? 'excepción activa' : 'excepciones activas' }} de este módulo: mientras esté apagado no tendrán efecto.
        </p>
      </template>

      <template v-else-if="change">
        <p class="mb-2">
          <strong>{{ label }}</strong> quedará en:
          {{ change.planSlugs.length ? change.planSlugs.map(nameOf).join(', ') : 'ningún plan (sin plan / a medida)' }}.
        </p>

        <div v-if="impactLoading" class="d-flex align-center ga-2 mb-3" role="status">
          <v-progress-circular indeterminate size="18" width="2" /> Calculando el impacto…
        </div>
        <v-alert v-else-if="impactError" type="error" variant="tonal" density="compact" class="mb-3" :text="impactError">
          <template #append><v-btn size="small" variant="text" @click="loadImpact">Reintentar</v-btn></template>
        </v-alert>
        <template v-else-if="impact">
          <ul v-if="impact.plans.length" class="impact-list mb-3">
            <li v-for="p in impact.plans" :key="p.slug">
              <strong>{{ p.name }}</strong> ({{ eventsLabel(p.events) }}): {{ rowText(p) }}
            </li>
          </ul>
          <p v-else class="mb-3 text-medium-emphasis">No cambia el acceso de ningún evento.</p>
        </template>

        <v-checkbox
          v-if="removes"
          v-model="keepForExisting"
          density="compact"
          hide-details
          label="Conservar en los eventos actuales"
          class="keep"
        />
        <p v-if="removes" class="text-caption text-medium-emphasis mb-3 keep-help">
          <template v-if="keepForExisting">
            Los eventos que hoy lo tienen lo siguen teniendo: se les crea una excepción activa, sin vencimiento
            <template v-if="impact">({{ impact.totalToLocked }} en total)</template>.
            Solo los eventos nuevos del plan no lo tendrán.
          </template>
          <template v-else>
            Los eventos de {{ removed.map(nameOf).join(', ') }} pierden el módulo ahora<template v-if="impact"> ({{ impact.totalToLocked }} en total)</template>,
            salvo los que ya tienen una excepción.
          </template>
        </p>

        <div v-if="typedRequired" class="mb-3">
          <v-alert type="warning" variant="tonal" density="compact" class="mb-2">
            <template v-if="impact && !keepForExisting && impact.totalToLocked > 25">Este cambio bloquea el módulo en más de 25 eventos.</template>
            <template v-else>Este módulo pasa de plan de pago a un plan gratis.</template>
            Para confirmar, escribe «{{ label }}».
          </v-alert>
          <v-text-field v-model="typed" label="Nombre del módulo" density="comfortable" hide-details autocomplete="off" :aria-label="`Escribe ${label} para confirmar`" />
        </div>
      </template>
    </div>
  </ReasonDialog>
</template>

<style scoped>
.impact-list { padding-left: 1.1rem; }
.impact-list li { margin-bottom: 4px; }
.keep { margin-top: -4px; }
.keep-help { margin-top: 0; }
</style>
