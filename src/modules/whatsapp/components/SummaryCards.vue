<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { getSummary } from '../services/whatsappApi'
import { countLabel, rateLabel, SUMMARY_ORDER } from '../logic'
import type { PeriodFilter, WaSummary } from '../types'

const props = defineProps<{ period: PeriodFilter }>()
const emit = defineEmits<{ loaded: [WaSummary] }>()

const summary = ref<WaSummary | null>(null)
const loading = ref(true)
const failed = ref(false)

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const data = await getSummary(props.period)
    if (request !== latest) return
    summary.value = data
    emit('loaded', data)
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)
watch(() => [props.period.from, props.period.to], load)
defineExpose({ load })
</script>

<template>
  <div :aria-busy="loading" data-testid="summary">
    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar el resumen de entregas.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>
    <div v-else class="grid" :class="{ 'is-loading': loading && summary }">
      <template v-if="loading && !summary">
        <v-card v-for="n in 7" :key="n" class="pa-3"><v-skeleton-loader type="text, heading" /></v-card>
      </template>
      <template v-else-if="summary">
        <v-card v-for="s in SUMMARY_ORDER" :key="s.key" class="stat" :data-stat="s.key">
          <span class="stat__label"><v-icon size="16" :icon="s.icon" /> {{ s.label }}</span>
          <strong class="stat__value">{{ countLabel(summary[s.key] as number) }}</strong>
        </v-card>
        <v-card class="stat stat--rate" data-stat="deliveryRate">
          <span class="stat__label"><v-icon size="16" icon="mdi-percent-outline" /> Tasa de entrega</span>
          <strong class="stat__value">{{ rateLabel(summary.deliveryRate) }}</strong>
          <span v-if="summary.deliveryRate === null" class="stat__note">Aún no se envió nada</span>
        </v-card>
      </template>
    </div>
  </div>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
@media (min-width: 600px) { .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (min-width: 1100px) { .grid { grid-template-columns: repeat(7, minmax(0, 1fr)); } }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.stat { padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.stat__label { font-size: 0.8125rem; color: var(--ink-500); display: inline-flex; align-items: center; gap: 6px; }
.stat__value { font-family: var(--font-heading); font-size: 1.75rem; font-weight: 500; line-height: 1.2; }
.stat__note { font-size: 0.75rem; color: var(--ink-500); }
</style>
