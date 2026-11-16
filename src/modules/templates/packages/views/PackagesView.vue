<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PackageStatusChip from '../components/PackageStatusChip.vue'
import TemplatesTabs from '../components/TemplatesTabs.vue'
import { listPackages } from '../packagesApi'
import {
  STATUS_LABEL, TIER_LABEL, VISIBILITY_LABEL, eventTypesLabel, eventsPinnedLabel, formatBytes, formatDateTime,
} from '../logic'
import type { PackageStatus, PackageSummary, Visibility } from '../types'

const items = ref<PackageSummary[] | null>(null)
const loading = ref(true)
const failed = ref(false)
const status = ref<PackageStatus | 'all'>('all')
const visibility = ref<Visibility | 'all'>('all')

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const page = await listPackages({ status: status.value === 'all' ? null : status.value, visibility: visibility.value === 'all' ? null : visibility.value })
    if (request === latest) items.value = page.items
  } catch { if (request === latest) failed.value = true } finally { if (request === latest) loading.value = false }
}
onMounted(load)
watch([status, visibility], load)

const filtered = computed(() => status.value !== 'all' || visibility.value !== 'all')
const empty = computed(() => !loading.value && !failed.value && items.value?.length === 0)
const statusItems = [{ value: 'all', title: 'Todos los estados' }, ...(['installed', 'active', 'deactivated', 'withdrawn'] as PackageStatus[]).map(value => ({ value, title: STATUS_LABEL[value] }))]
const visibilityItems = [{ value: 'all', title: 'Públicos y privados' }, { value: 'public', title: VISIBILITY_LABEL.public }, { value: 'private', title: VISIBILITY_LABEL.private }]
const detail = (p: PackageSummary) => ({ name: 'TemplatePackageDetail', params: { id: p.id } })
</script>

<template>
  <div>
    <TemplatesTabs current="packages" />
    <div class="top">
      <p class="text-medium-emphasis intro mb-0">
        Un paquete trae su propio diseño (HTML, CSS y assets). Al subirlo se valida solo y queda como borrador: el equipo lo revisa con la vista previa y lo activa.
        Nada llega a las organizadoras sin activación.
      </p>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-upload" class="tap" :to="{ name: 'TemplatePackageNew' }">Subir paquete</v-btn>
    </div>

    <div class="filters">
      <v-select v-model="status" :items="statusItems" label="Estado" density="compact" variant="outlined" hide-details />
      <v-select v-model="visibility" :items="visibilityItems" label="Visibilidad" density="compact" variant="outlined" hide-details />
    </div>

    <div v-if="loading && !items" aria-busy="true" role="status" aria-label="Cargando los paquetes">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" class="mb-3" />
    </div>

    <v-card v-else-if="failed && !items" class="pa-6 text-center">
      <p class="mb-3">No pudimos cargar los paquetes.</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <v-card v-else-if="empty" class="pa-6 text-center" data-testid="empty">
      <v-icon icon="mdi-package-variant-closed" size="40" class="mb-2 text-medium-emphasis" />
      <p class="mb-3 text-medium-emphasis">{{ filtered ? 'Ningún paquete coincide con los filtros.' : 'Todavía no hay paquetes instalados.' }}</p>
      <v-btn v-if="!filtered" color="primary" variant="flat" prepend-icon="mdi-upload" :to="{ name: 'TemplatePackageNew' }">Subir el primero</v-btn>
    </v-card>

    <div v-else-if="items" :class="{ dim: loading }" :aria-busy="loading">
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mb-3">
        No pudimos actualizar. <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <v-card class="only-wide">
        <v-table>
          <caption class="visually-hidden">Paquetes de plantilla</caption>
          <thead>
            <tr>
              <th scope="col">Paquete</th><th scope="col">Versión</th><th scope="col">Estado</th><th scope="col">Visibilidad</th>
              <th scope="col">Tipo de evento</th><th scope="col">Instalado</th><th scope="col" class="text-right">Eventos</th><th scope="col"><span class="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in items" :key="p.id" :data-package="p.id">
              <th scope="row" class="name">
                <router-link :to="detail(p)">{{ p.name.es }}</router-link>
                <div class="slug">{{ p.slug }} · {{ TIER_LABEL[p.tier] ?? p.tier }} · {{ formatBytes(p.sizeBytes) }}</div>
              </th>
              <td>{{ p.semver }}</td>
              <td><PackageStatusChip :status="p.status" /></td>
              <td><v-chip size="small" variant="tonal" :prepend-icon="p.visibility === 'private' ? 'mdi-lock-outline' : 'mdi-earth'">{{ VISIBILITY_LABEL[p.visibility] }}</v-chip></td>
              <td>{{ eventTypesLabel(p.eventTypes) }}</td>
              <td>{{ formatDateTime(p.installedAt) }}</td>
              <td class="text-right">{{ p.eventsPinned }}</td>
              <td class="text-right"><v-btn size="small" variant="tonal" :to="detail(p)">Abrir</v-btn></td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <ul class="cards only-narrow">
        <li v-for="p in items" :key="p.id" :data-package="p.id">
          <v-card class="pa-4">
            <div class="d-flex align-start ga-2 mb-2">
              <router-link class="card-name" :to="detail(p)">{{ p.name.es }}</router-link>
              <PackageStatusChip :status="p.status" class="ml-auto flex-none" />
            </div>
            <dl class="facts">
              <dt>Paquete</dt><dd>{{ p.slug }} {{ p.semver }}</dd>
              <dt>Visibilidad</dt><dd>{{ VISIBILITY_LABEL[p.visibility] }} · {{ TIER_LABEL[p.tier] ?? p.tier }}</dd>
              <dt>Tipo de evento</dt><dd>{{ eventTypesLabel(p.eventTypes) }}</dd>
              <dt>Eventos</dt><dd>{{ eventsPinnedLabel(p.eventsPinned) }}</dd>
            </dl>
            <v-btn block variant="tonal" class="mt-3 tap" :to="detail(p)">Abrir</v-btn>
          </v-card>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.intro { max-width: 70ch; }
.filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 260px)); gap: 12px; margin-bottom: 16px; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.name { font-weight: 600; text-align: left; }
.slug { font-weight: 400; font-size: 0.82rem; color: var(--ink-500); }
.name a, .card-name { color: var(--rose-700); }
.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.card-name { font-weight: 600; font-size: 1.05rem; overflow-wrap: anywhere; }
.facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; margin: 0; }
.facts dt { color: var(--ink-500); }
.facts dd { margin: 0; overflow-wrap: anywhere; }
.tap { min-height: 44px; }
.flex-none { flex: none; }
@media (max-width: 599px) { .top .v-btn { width: 100%; } }
.only-narrow { display: grid; }
.only-wide { display: none; }
@media (min-width: 960px) {
  .only-narrow { display: none; }
  .only-wide { display: block; }
}
</style>
