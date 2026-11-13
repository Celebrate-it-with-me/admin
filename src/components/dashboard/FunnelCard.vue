<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardData } from '@/types'

const props = defineProps<{ funnel: DashboardData['funnel']; days: number }>()

const LABELS: Record<string, string> = {
  signups: 'Se registraron',
  event: 'Crearon un evento',
  guests: 'Cargaron invitados',
  published: 'Publicaron',
  paid: 'Pagaron',
}

const top = computed(() => props.funnel[0]?.count ?? 0)
const steps = computed(() =>
  props.funnel.map((step, i) => {
    const previous = i === 0 ? step.count : props.funnel[i - 1].count
    return {
      ...step,
      label: LABELS[step.key],
      width: top.value > 0 ? Math.max(step.count > 0 ? 3 : 0, Math.round((step.count / top.value) * 100)) : 0,
      share: top.value > 0 ? Math.round((step.count / top.value) * 100) : 0,
      lost: Math.max(0, previous - step.count),
    }
  })
)
</script>

<template>
  <v-card class="pa-5 h-100">
    <h3 class="text-h6 mb-1">Embudo</h3>
    <p class="text-body-2 text-medium-emphasis mb-5">De las cuentas que se registraron en los últimos {{ days }} días, ¿hasta dónde llegaron?</p>

    <ol class="funnel">
      <li v-for="(step, i) in steps" :key="step.key" class="funnel__row">
        <div class="funnel__head">
          <span class="funnel__label">{{ step.label }}</span>
          <span class="funnel__count">{{ step.count }}<small v-if="i > 0 && top > 0"> · {{ step.share }}%</small></span>
        </div>
        <div class="funnel__track" role="presentation"><div class="funnel__bar" :style="{ width: step.width + '%' }" /></div>
        <p v-if="i > 0 && step.lost > 0" class="funnel__lost">{{ step.lost }} no pasaron de aquí</p>
      </li>
    </ol>
  </v-card>
</template>

<style scoped>
.funnel { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
.funnel__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
.funnel__label { font-weight: 600; }
.funnel__count { font-family: var(--font-heading); font-size: 1.25rem; }
.funnel__count small { font-family: var(--font-body); font-size: 0.8125rem; color: var(--ink-500); }
.funnel__track { height: 10px; border-radius: 999px; background: var(--cream-200); overflow: hidden; }
.funnel__bar { height: 100%; border-radius: 999px; background: var(--rose-600); transition: width 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
.funnel__lost { font-size: 0.8125rem; color: var(--ink-500); margin-top: 4px; }
@media (prefers-reduced-motion: reduce) { .funnel__bar { transition: none; } }
</style>
