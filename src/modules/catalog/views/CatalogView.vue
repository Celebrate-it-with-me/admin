<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import CatalogMatrix from '../components/CatalogMatrix.vue'
import ChangeDialog from '../components/ChangeDialog.vue'
import { fetchCatalog } from '../services/catalogApi'
import { exceptionsTotal, groupBySection, planSlugsAfter } from '../logic'
import type { Catalog, CatalogModule, CatalogPlan, PendingChange } from '../types'

const me = useCurrentUserStore()
const canEdit = computed(() => me.can('admin.catalog.manage'))

const catalog = ref<Catalog | null>(null)
const loading = ref(true)
const failed = ref(false)
const notice = ref('')
const pending = ref<PendingChange | null>(null)

const load = async () => {
  loading.value = true
  failed.value = false
  try { catalog.value = await fetchCatalog() } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const groups = computed(() => groupBySection(catalog.value?.modules ?? []))
const plans = computed(() => catalog.value?.plans ?? [])
const empty = computed(() => !loading.value && !failed.value && !(catalog.value?.modules.length))
const totalExceptions = computed(() => exceptionsTotal(catalog.value?.modules ?? []))
const withoutPlan = computed(() => (catalog.value?.modules ?? []).filter(m => !m.planSlugs.length).length)

// Nothing is saved from the matrix: a click only proposes a change, and the dialog confirms it.
const proposePlan = (module: CatalogModule, plan: CatalogPlan, on: boolean) => {
  if (!canEdit.value || plan.isFullPlan) return // the paid plan always includes everything: never sent
  notice.value = ''
  pending.value = { kind: 'plans', module, planSlugs: planSlugsAfter(module.planSlugs, plans.value, plan.slug, on) }
}
const proposeToggle = (module: CatalogModule, isEnabled: boolean) => {
  if (!canEdit.value) return
  notice.value = ''
  pending.value = { kind: 'toggle', module, isEnabled }
}

const saved = async (text: string) => {
  pending.value = null
  await load()
  notice.value = text
}
</script>

<template>
  <div>
    <p class="text-medium-emphasis mb-4 intro">
      Qué módulos incluye cada plan. Un cambio se confirma antes de guardarse y no toca los eventos que ya tienen una excepción.
    </p>

    <div v-if="loading && !catalog" aria-busy="true" role="status" aria-label="Cargando el catálogo">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line, list-item-two-line" class="mb-4" />
    </div>

    <v-card v-else-if="failed && !catalog" class="pa-6 text-center">
      <p class="mb-3">No pudimos cargar el catálogo.</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <v-card v-else-if="empty" class="pa-6 text-center">
      <p class="text-medium-emphasis">El catálogo todavía no tiene módulos.</p>
    </v-card>

    <div v-else-if="catalog" :class="{ dim: loading }" :aria-busy="loading">
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mb-3">
        No pudimos actualizar.
        <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>
      <v-alert v-if="notice" type="success" variant="tonal" density="compact" closable class="mb-3" aria-live="polite" @click:close="notice = ''">{{ notice }}</v-alert>

      <div class="counters mb-4">
        <v-chip v-for="p in plans" :key="p.slug" variant="tonal" color="secondary" prepend-icon="mdi-calendar-heart">{{ p.name }}: {{ p.eventsCount }}</v-chip>
        <v-chip variant="tonal" color="success" prepend-icon="mdi-gift-outline">Excepciones activas: {{ totalExceptions }}</v-chip>
        <v-chip v-if="withoutPlan" variant="tonal" color="accent" prepend-icon="mdi-puzzle-outline">Sin plan: {{ withoutPlan }}</v-chip>
        <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="loading" @click="load">Actualizar</v-btn>
      </div>

      <CatalogMatrix :groups="groups" :plans="plans" :can-edit="canEdit" @toggle-plan="proposePlan" @toggle-enabled="proposeToggle" />

      <p v-if="!canEdit" class="text-caption text-medium-emphasis">Tu rol puede ver el catálogo pero no cambiarlo.</p>
      <p v-else class="text-caption text-medium-emphasis">El plan de pago incluye todo: sus casillas no se pueden quitar.</p>
    </div>

    <ChangeDialog :change="pending" :plans="plans" @close="pending = null" @saved="saved" />
  </div>
</template>

<style scoped>
.intro { max-width: 70ch; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.counters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
</style>
