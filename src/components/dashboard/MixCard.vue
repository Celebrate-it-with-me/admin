<script setup lang="ts">
import { computed } from 'vue'
import type { DashboardCharts } from '@/types'

const props = defineProps<{ mix: DashboardCharts['mix'] }>()

const NAMES: Record<string, string> = {
  quinceanera: 'Quinceañera', wedding: 'Boda', other: 'Otros',
  basic: 'Gratis', premium: 'Completo',
  draft: 'Borrador', save_the_date: 'Save the date', invitation: 'Invitación', archived: 'Archivado',
}

// Only the quinceañera and the wedding are on sale; any other type is hidden in the product, so it is one "Otros" row here.
const types = computed(() => {
  const main = props.mix.type.filter(r => r.key === 'quinceanera' || r.key === 'wedding')
  const other = props.mix.type.filter(r => r.key !== 'quinceanera' && r.key !== 'wedding').reduce((a, r) => a + r.count, 0)
  return other > 0 ? [...main, { key: 'other', count: other }] : main
})

const groups = computed(() => [
  { title: 'Por tipo', rows: types.value },
  { title: 'Por plan', rows: props.mix.plan },
  { title: 'Por etapa', rows: props.mix.stage },
].map(g => {
  const total = g.rows.reduce((a, r) => a + r.count, 0)
  const max = Math.max(1, ...g.rows.map(r => r.count))
  return { ...g, total, rows: g.rows.map(r => ({ ...r, name: NAMES[r.key] ?? r.key, width: Math.round((r.count / max) * 100), share: total ? Math.round((r.count / total) * 100) : 0 })) }
}))
</script>

<template>
  <v-card class="pa-5 h-100">
    <h3 class="text-h6 mb-1">Eventos por…</h3>
    <p class="text-body-2 text-medium-emphasis mb-5">Cómo se reparten los eventos que hay ahora.</p>

    <div v-for="g in groups" :key="g.title" class="group">
      <p class="group__title">{{ g.title }}</p>
      <ul class="rows">
        <li v-for="r in g.rows" :key="r.key" class="row" :title="`${r.name}: ${r.count} (${r.share}%)`">
          <span class="row__name">{{ r.name }}</span>
          <span class="row__track" role="presentation"><span class="row__bar" :style="{ width: r.width + '%' }" /></span>
          <span class="row__count">{{ r.count }}</span>
        </li>
      </ul>
    </div>
  </v-card>
</template>

<style scoped>
.group + .group { margin-top: 20px; }
.group__title { font-size: 0.8125rem; font-weight: 700; color: var(--ink-500); margin: 0 0 8px; }
.rows { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.row { display: grid; grid-template-columns: 104px 1fr 32px; align-items: center; gap: 12px; font-size: 0.9375rem; }
.row__track { height: 10px; border-radius: 0 4px 4px 0; display: block; }
.row__bar { display: block; height: 10px; background: var(--rose-600); border-radius: 0 4px 4px 0; min-width: 2px; transition: width 0.4s cubic-bezier(0.23, 1, 0.32, 1); }
.row__count { font-family: var(--font-heading); font-size: 1.125rem; text-align: right; }
@media (prefers-reduced-motion: reduce) { .row__bar { transition: none; } }
</style>
