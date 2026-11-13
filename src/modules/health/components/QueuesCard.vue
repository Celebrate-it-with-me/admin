<script setup lang="ts">
import { onMounted } from 'vue'
import { useLoader } from '../useLoader'
import { fetchQueues } from '../services/healthApi'
import { agoFromDate, agoFromSeconds, SCHEDULER_PROBE, SCHEDULER_TEXT } from '../logic'
import HealthCard from './HealthCard.vue'
import StatusChip from './StatusChip.vue'

const { data, loading, failed, load } = useLoader(fetchQueues)
onMounted(load)
defineExpose({ load })
</script>

<template>
  <HealthCard title="Colas y procesos" subtitle="Trabajo pendiente y señales de que alguien lo está atendiendo." icon="mdi-tray-full"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos cargar las colas." @retry="load">
    <template v-if="data">
      <ul class="signals">
        <li>
          <span class="signals__name">Programador de tareas</span>
          <StatusChip :status="SCHEDULER_PROBE[data.scheduler.status]" :text="SCHEDULER_TEXT[data.scheduler.status]" />
          <span class="signals__hint">{{ data.scheduler.lastBeatAt ? `Último latido ${agoFromDate(data.scheduler.lastBeatAt)}` : 'Aún no hay latido registrado' }}</span>
        </li>
        <li>
          <span class="signals__name">Procesador de colas</span>
          <StatusChip v-if="data.stalledSuspected" status="error" text="Posiblemente detenido" />
          <StatusChip v-else-if="data.stalledSuspected === false" status="ok" text="Sin atrasos" />
          <StatusChip v-else status="unknown" text="Sin datos" />
          <span class="signals__hint">
            <template v-if="data.oldestPendingSeconds !== null">Lo pendiente más antiguo espera desde {{ agoFromSeconds(data.oldestPendingSeconds).replace('hace ', '') }}.</template>
            <template v-else>No se puede saber con fiabilidad si el procesador está activo.</template>
          </span>
        </li>
      </ul>

      <v-alert v-if="!data.measurable" type="info" variant="tonal" density="comfortable" class="mt-3"
        :text="data.error ?? `El sistema usa la cola «${data.driver}», cuyo tamaño no se puede medir. Sin datos.`" />
      <template v-else>
        <p class="total"><strong>{{ data.pendingTotal }}</strong> pendientes en total <span class="text-medium-emphasis">· cola «{{ data.driver }}»</span></p>
        <v-table density="comfortable" class="qtable">
          <caption class="sr-only">Tamaño de cada cola</caption>
          <thead><tr><th scope="col">Cola</th><th scope="col" class="num">Pendientes</th><th scope="col" class="num">Futuros</th><th scope="col" class="num">Activos</th></tr></thead>
          <tbody>
            <tr v-for="q in data.queues" :key="q.name">
              <th scope="row">{{ q.name }}</th>
              <td class="num">{{ q.pending }}</td>
              <td class="num">{{ q.delayed ?? 'Sin datos' }}</td>
              <td class="num">{{ q.reserved ?? 'Sin datos' }}</td>
            </tr>
          </tbody>
        </v-table>
      </template>
    </template>
  </HealthCard>
</template>

<style scoped>
.signals { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.signals li { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; }
.signals__name { font-weight: 600; min-width: 170px; }
.signals__hint { font-size: 0.8125rem; color: var(--ink-500); flex-basis: 100%; }
.total { margin: 16px 0 8px; }
.qtable { background: transparent; }
.qtable :deep(th), .qtable :deep(td) { padding: 0 8px !important; }
.qtable th { text-align: left; font-weight: 600; }
.num { text-align: right !important; white-space: nowrap; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
