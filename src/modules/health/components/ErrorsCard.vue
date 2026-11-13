<script setup lang="ts">
import { onMounted } from 'vue'
import { useLoader } from '../useLoader'
import { fetchErrors } from '../services/healthApi'
import { agoFromDate, dateTime, LEVEL_TEXT } from '../logic'
import HealthCard from './HealthCard.vue'

const { data, loading, failed, load } = useLoader(() => fetchErrors(20))
onMounted(load)
defineExpose({ load })
</script>

<template>
  <HealthCard title="Errores recientes" subtitle="Últimos errores del registro de la API, resumidos y sin datos personales. Los repetidos se agrupan." icon="mdi-bug-outline"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos cargar los errores recientes." @retry="load">
    <template v-if="data">
      <p v-if="!data.available" class="empty"><v-icon icon="mdi-help-circle-outline" size="20" aria-hidden="true" /> Sin datos: no hay un archivo de registro que leer.</p>
      <p v-else-if="!data.items.length" class="empty"><v-icon icon="mdi-check-circle-outline" color="success" size="20" aria-hidden="true" /> No hay errores recientes en el registro.</p>
      <ul v-else class="list">
        <li v-for="(e, i) in data.items" :key="i" class="item">
          <div class="item__top">
            <v-chip :color="e.level === 'error' ? 'warning' : 'error'" variant="tonal" size="x-small" class="font-weight-bold">{{ LEVEL_TEXT[e.level] ?? e.level }}</v-chip>
            <v-chip v-if="e.count > 1" size="x-small" variant="outlined">se repitió {{ e.count }} veces</v-chip>
            <time class="item__when" :datetime="e.at" :title="dateTime(e.at)">{{ agoFromDate(e.at) }}</time>
          </div>
          <p class="item__msg">{{ e.message }}</p>
        </li>
      </ul>
    </template>
  </HealthCard>
</template>

<style scoped>
.empty { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--ink-700); }
.list { list-style: none; margin: 0; padding: 0; }
.item { padding: 12px 0; border-top: 1px solid var(--line); }
.item:first-child { border-top: 0; padding-top: 0; }
.item__top { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.item__when { margin-left: auto; font-size: 0.8125rem; color: var(--ink-500); white-space: nowrap; }
.item__msg { margin: 4px 0 0; font-size: 0.875rem; color: var(--ink-700); overflow-wrap: anywhere; }
</style>
