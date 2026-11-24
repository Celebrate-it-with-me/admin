<script setup lang="ts">
import { computed } from 'vue'
import { CHECKLIST, PREVIEW_DEVICES, PREVIEW_STATES, activationMissing, type PreviewCoverage } from '../logic'

/** What is left before "Activar" opens, next to the button: a done/pending list plus one sentence the button points to. */
const props = defineProps<{ id: string; coverage: PreviewCoverage; checksDone: number; /** Why the preview cannot be completed, when it failed to load. */ problem?: string }>()

const missing = computed(() => activationMissing(props.coverage, props.checksDone))
const summary = computed(() => (missing.value.length ? `Falta: ${missing.value.map(m => m.label).join(' · ')}` : 'Todo listo para activar.'))
const rows = computed(() => [
  ...PREVIEW_DEVICES.map(d => ({ key: `d-${d.value}`, label: `Vista de ${d.label}`, done: props.coverage.devices.includes(d.value) })),
  ...PREVIEW_STATES.map(s => ({ key: `s-${s.value}`, label: `Estado «${s.label}»`, done: props.coverage.states.includes(s.value) })),
  { key: 'checks', label: `Comprobaciones de calidad (${props.checksDone} de ${CHECKLIST.length})`, done: props.checksDone >= CHECKLIST.length },
])
</script>

<template>
  <div class="ap" data-testid="activation-progress">
    <p :id="id" class="sum" :class="{ ok: !missing.length }" role="status" aria-live="polite" data-testid="activation-summary">{{ summary }}</p>
    <p v-if="problem && missing.length" class="prob" role="alert" data-testid="activation-problem">
      <v-icon icon="mdi-alert-outline" size="16" aria-hidden="true" /> {{ problem }}
    </p>
    <ul v-if="missing.length" class="rows">
      <li v-for="r in rows" :key="r.key" :data-done="r.done">
        <v-icon :icon="r.done ? 'mdi-check-circle' : 'mdi-circle-outline'" :color="r.done ? 'success' : undefined" size="16" aria-hidden="true" />
        <span class="visually-hidden">{{ r.done ? 'Hecho: ' : 'Pendiente: ' }}</span>{{ r.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ap { flex-basis: 100%; margin-top: 4px; }
.sum { margin: 0 0 4px; font-size: 0.9rem; font-weight: 600; }
.sum.ok { color: rgb(var(--v-theme-success)); }
.prob { margin: 0 0 6px; font-size: 0.88rem; color: rgb(var(--v-theme-error)); }
.rows { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 2px 16px; font-size: 0.85rem; }
.rows li { display: inline-flex; align-items: center; gap: 4px; }
.rows li[data-done='true'] { color: var(--ink-500); }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
