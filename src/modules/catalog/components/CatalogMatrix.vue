<script setup lang="ts">
import { eventsLabel, limitLabel, moduleLabel, sectionLabel } from '../logic'
import type { CatalogModule, CatalogPlan } from '../types'

// Matrix of modules by plan. It only reports what the person asked for; the parent confirms and saves.
defineProps<{
  groups: { section: string; rows: CatalogModule[] }[]
  plans: CatalogPlan[]
  canEdit: boolean
}>()
const emit = defineEmits<{ togglePlan: [CatalogModule, CatalogPlan, boolean]; toggleEnabled: [CatalogModule, boolean] }>()

const priceLabel = (p: CatalogPlan) => (p.priceCents ? `$${(p.priceCents / 100).toFixed(p.priceCents % 100 ? 2 : 0)}` : 'Gratis')
const exceptions = (m: CatalogModule) => m.overrides.active + m.overrides.locked
const exceptionsText = (m: CatalogModule) => {
  const parts: string[] = []
  if (m.overrides.active) parts.push(`${m.overrides.active} ${m.overrides.active === 1 ? 'regalo' : 'regalos'}`)
  if (m.overrides.locked) parts.push(`${m.overrides.locked} ${m.overrides.locked === 1 ? 'bloqueo' : 'bloqueos'}`)
  return parts.join(' · ')
}
</script>

<template>
  <v-card v-for="g in groups" :key="g.section" class="mb-4 group">
    <h3 class="text-h6 px-5 pt-4 pb-2">{{ sectionLabel(g.section) }}</h3>
    <table class="matrix">
      <caption class="sr-only">Módulos de {{ sectionLabel(g.section) }} y los planes que los incluyen</caption>
      <thead>
        <tr>
          <th scope="col" class="module-col">Módulo</th>
          <th scope="col" class="switch-col">Encendido</th>
          <th v-for="p in plans" :key="p.slug" scope="col" class="plan-col">
            <span class="plan-name">{{ p.name }}</span>
            <span class="plan-meta">{{ eventsLabel(p.eventsCount) }}</span>
            <span class="plan-meta">{{ limitLabel(p) }} · {{ priceLabel(p) }}</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="m in g.rows" :key="m.key" :class="{ off: !m.isEnabled }">
          <th scope="row" class="module-col">
            <span class="module-name">{{ moduleLabel(m.key) }}</span>
            <v-chip v-if="!m.planSlugs.length" size="x-small" variant="tonal" color="accent" class="ml-2">Sin plan / a medida</v-chip>
            <span v-if="exceptions(m)" class="exceptions text-caption text-medium-emphasis d-block">
              <v-icon size="14" icon="mdi-gift-outline" aria-hidden="true" /> Excepciones activas: {{ exceptionsText(m) }}
            </span>
          </th>
          <td class="switch-col" :data-label="'Encendido'">
            <v-switch
              :model-value="m.isEnabled"
              :disabled="!canEdit"
              :aria-label="`${moduleLabel(m.key)}: encendido para todos`"
              color="primary"
              density="compact"
              hide-details
              inset
              @update:model-value="emit('toggleEnabled', m, Boolean($event))"
            />
            <span class="cell-label">Encendido para todos</span>
          </td>
          <td v-for="p in plans" :key="p.slug" class="plan-col">
            <v-tooltip v-if="p.isFullPlan" text="El plan de pago incluye todo" location="top">
              <template #activator="{ props: tip }">
                <span v-bind="tip" class="locked-box" tabindex="0" :aria-label="`${moduleLabel(m.key)} en ${p.name}: incluido siempre. El plan de pago incluye todo`">
                  <v-checkbox-btn :model-value="true" disabled density="compact" tabindex="-1" aria-hidden="true" />
                  <v-icon size="14" icon="mdi-lock-outline" aria-hidden="true" />
                </span>
              </template>
            </v-tooltip>
            <v-checkbox-btn
              v-else
              :model-value="m.planSlugs.includes(p.slug)"
              :disabled="!canEdit"
              :aria-label="`${moduleLabel(m.key)} en ${p.name}`"
              density="compact"
              @update:model-value="emit('togglePlan', m, p, Boolean($event))"
            />
            <span class="cell-label">{{ p.name }}</span>
            <span v-if="m.planSlugs.includes(p.slug)" class="count" :title="`${eventsLabel(m.eventsByPlan[p.slug] ?? 0)} con este plan`">
              {{ eventsLabel(m.eventsByPlan[p.slug] ?? 0) }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </v-card>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.matrix { width: 100%; border-collapse: collapse; }
.matrix th, .matrix td { padding: 10px 16px; text-align: left; vertical-align: middle; border-top: 1px solid var(--line); }
.matrix thead th { font-size: 0.75rem; font-weight: 600; color: rgba(var(--v-theme-on-surface), 0.7); border-top: 0; vertical-align: bottom; }
.module-col { width: 34%; }
.module-name { font-weight: 500; }
.plan-col, .switch-col { text-align: center !important; }
.plan-name { display: block; font-size: 0.875rem; color: rgb(var(--v-theme-on-surface)); }
.plan-meta { display: block; font-weight: 400; }
.off .module-name { text-decoration: line-through; text-decoration-thickness: 1px; opacity: 0.7; }
.count { display: block; font-size: 0.7rem; color: rgba(var(--v-theme-on-surface), 0.6); }
.locked-box { display: inline-flex; align-items: center; gap: 2px; border-radius: 4px; }
.locked-box:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.cell-label { display: none; }
.matrix :deep(.v-selection-control), .matrix :deep(.v-switch) { justify-content: center; }
.matrix :deep(.v-selection-control--density-compact) { --v-selection-control-size: 44px; }

@media (max-width: 760px) {
  .matrix, .matrix tbody, .matrix tr, .matrix th, .matrix td { display: block; }
  .matrix thead { position: absolute; left: -9999px; }
  .matrix tr { padding: 12px 16px; border-top: 1px solid var(--line); }
  .matrix th, .matrix td { padding: 0; border: 0; text-align: left !important; width: auto; }
  .module-name { font-size: 1rem; }
  .matrix td { display: flex; align-items: center; gap: 8px; min-height: 44px; flex-wrap: wrap; }
  .matrix td :deep(.v-selection-control) { flex: none; justify-content: flex-start; }
  .cell-label { display: inline; flex: 1; }
  .count { margin-left: auto; }
}
</style>
