<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useLoader } from '../useLoader'
import { fetchFailedJobs } from '../services/healthApi'
import { agoFromDate, dateTime, plural, shortClass } from '../logic'
import HealthCard from './HealthCard.vue'

const { data, loading, failed, load } = useLoader(() => fetchFailedJobs(20))
onMounted(load)
defineExpose({ load })

const empty = computed(() => data.value?.total === 0)
</script>

<template>
  <HealthCard title="Trabajos fallidos" subtitle="Tareas en segundo plano que se rindieron (correos, recordatorios...). Solo lectura." icon="mdi-alert-octagon-outline"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos cargar los trabajos fallidos." @retry="load">
    <template v-if="data">
      <div class="stats">
        <div><p class="stat__value">{{ data.total }}</p><p class="stat__label">en total</p></div>
        <div><p class="stat__value">{{ data.last24h }}</p><p class="stat__label">en las últimas 24 h</p></div>
        <div v-if="data.byQueue.length" class="stat__queues">
          <v-chip v-for="q in data.byQueue" :key="q.queue" size="small" variant="outlined">{{ q.queue }} · {{ q.total }}</v-chip>
        </div>
      </div>

      <p v-if="empty" class="empty"><v-icon icon="mdi-check-circle-outline" color="success" size="20" aria-hidden="true" /> No hay trabajos fallidos. Todo en orden.</p>
      <template v-else>
        <p class="text-body-2 text-medium-emphasis mb-2">Los {{ plural(data.items.length, 'más reciente', 'más recientes') }}. Los mensajes se resumen y se limpian de correos, teléfonos y claves.</p>
        <ul class="list">
          <li v-for="j in data.items" :key="j.id" class="item">
            <div class="item__top">
              <strong class="item__job" :title="j.job ?? undefined">{{ shortClass(j.job) }}</strong>
              <v-chip size="x-small" variant="tonal">{{ j.queue }}</v-chip>
              <time class="item__when" :datetime="j.failedAt ?? undefined" :title="dateTime(j.failedAt)">{{ agoFromDate(j.failedAt) }}</time>
            </div>
            <p class="item__msg"><span v-if="j.exceptionClass" class="item__class">{{ shortClass(j.exceptionClass) }}:</span> {{ j.message || 'Sin mensaje' }}</p>
          </li>
        </ul>
      </template>
    </template>
  </HealthCard>
</template>

<style scoped>
.stats { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 32px; margin-bottom: 16px; }
.stat__value { font-family: var(--font-heading); font-size: 2rem; line-height: 1.1; margin: 0; }
.stat__label { font-size: 0.8125rem; color: var(--ink-500); margin: 0; }
.stat__queues { display: flex; flex-wrap: wrap; gap: 6px; }
.empty { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--ink-700); }
.list { list-style: none; margin: 0; padding: 0; }
.item { padding: 12px 0; border-top: 1px solid var(--line); }
.item__top { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.item__job { overflow-wrap: anywhere; }
.item__when { margin-left: auto; font-size: 0.8125rem; color: var(--ink-500); white-space: nowrap; }
.item__msg { margin: 4px 0 0; font-size: 0.875rem; color: var(--ink-700); overflow-wrap: anywhere; }
.item__class { font-weight: 600; }
</style>
