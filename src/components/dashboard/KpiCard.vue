<script setup lang="ts">
import { computed } from 'vue'
import type { MetricPair } from '@/types'

const props = defineProps<{
  label: string
  metric: MetricPair
  /** Format the number (money); plain count by default. */
  format?: (n: number) => string
  /** More is worse (refunds): the colour of the change flips. */
  inverse?: boolean
  days: number
}>()

const show = (n: number) => (props.format ? props.format(n) : String(n))
const tone = computed(() => {
  if (props.metric.change === 0) return 'neutral'
  return (props.metric.change > 0) !== !!props.inverse ? 'good' : 'bad'
})
const icon = computed(() => (props.metric.change > 0 ? 'mdi-arrow-up' : props.metric.change < 0 ? 'mdi-arrow-down' : 'mdi-minus'))
const summary = computed(() => {
  const change = props.metric.change
  if (change === 0) return `Igual que los ${props.days} días anteriores`
  return `${change > 0 ? 'Subió' : 'Bajó'} ${show(Math.abs(change))} frente a los ${props.days} días anteriores`
})
</script>

<template>
  <v-card class="kpi pa-5 h-100">
    <p class="kpi__label">{{ label }}</p>
    <p class="kpi__value">{{ show(metric.value) }}</p>
    <p class="kpi__delta" :class="`kpi__delta--${tone}`" :title="summary">
      <v-icon :icon="icon" size="14" aria-hidden="true" />
      <span>{{ metric.change > 0 ? '+' : metric.change < 0 ? '−' : '' }}{{ metric.change === 0 ? 'sin cambio' : show(Math.abs(metric.change)) }}</span>
      <span class="sr-only">{{ summary }}</span>
    </p>
  </v-card>
</template>

<style scoped>
.kpi__label { font-size: 0.875rem; font-weight: 600; color: var(--ink-500); }
.kpi__value { font-family: var(--font-heading); font-size: 2.5rem; line-height: 1.1; margin: 8px 0 12px; color: var(--ink-900); }
.kpi__delta { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; border-radius: 999px; padding: 2px 10px 2px 8px; }
.kpi__delta--good { color: #2e5f43; background: #eef6f0; }
.kpi__delta--bad { color: #8a2922; background: #fbedec; }
.kpi__delta--neutral { color: var(--ink-500); background: var(--cream-200); }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
