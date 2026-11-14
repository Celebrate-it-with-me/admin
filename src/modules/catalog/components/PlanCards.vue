<script setup lang="ts">
import { eventsLabel, isNotForSale, limitLabel, priceLabel } from '../logic'
import type { CatalogPlan } from '../types'

// One card per plan: what it is today and, for a superadmin, the way into editing it. It only reports the click.
defineProps<{ plans: CatalogPlan[]; canEdit: boolean }>()
const emit = defineEmits<{ edit: [CatalogPlan] }>()
</script>

<template>
  <section class="plans" aria-labelledby="plans-title">
    <h3 id="plans-title" class="sr-only">Planes</h3>
    <article v-for="p in plans" :key="p.slug" class="plan-card" :aria-label="`Plan ${p.name}`">
      <header class="plan-head">
        <h4 class="plan-title">{{ p.name }}</h4>
        <v-chip v-if="isNotForSale(p)" size="x-small" variant="tonal" color="accent" prepend-icon="mdi-storefront-outline">No a la venta</v-chip>
        <v-chip v-else-if="p.isFullPlan" size="x-small" variant="tonal" color="primary">Plan de pago</v-chip>
      </header>
      <p v-if="p.description" class="plan-description text-medium-emphasis">{{ p.description }}</p>
      <dl class="plan-facts">
        <div><dt>Invitados</dt><dd>{{ limitLabel(p) }}</dd></div>
        <div><dt>Precio</dt><dd>{{ priceLabel(p) }}</dd></div>
        <div><dt>Eventos</dt><dd>{{ eventsLabel(p.eventsCount) }}</dd></div>
      </dl>
      <v-btn
        v-if="canEdit"
        variant="tonal"
        size="small"
        prepend-icon="mdi-pencil-outline"
        class="plan-edit"
        :aria-label="`Editar plan ${p.name}`"
        @click="emit('edit', p)"
      >Editar plan</v-btn>
    </article>
  </section>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.plans { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; margin-bottom: 16px; }
.plan-card { display: flex; flex-direction: column; gap: 8px; padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: rgb(var(--v-theme-surface)); }
.plan-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.plan-title { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 500; margin: 0; }
.plan-description { font-size: 0.8125rem; margin: 0; overflow-wrap: anywhere; }
.plan-facts { display: grid; gap: 2px; margin: 0; font-size: 0.875rem; }
.plan-facts div { display: flex; justify-content: space-between; gap: 12px; }
.plan-facts dt { color: rgba(var(--v-theme-on-surface), 0.7); }
.plan-facts dd { margin: 0; text-align: right; }
.plan-edit { align-self: flex-start; margin-top: auto; min-height: 44px; }
</style>
