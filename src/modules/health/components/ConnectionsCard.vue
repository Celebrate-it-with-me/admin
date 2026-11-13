<script setup lang="ts">
import { onMounted } from 'vue'
import { useLoader } from '../useLoader'
import { fetchConnections } from '../services/healthApi'
import { PROBE_TEXT } from '../logic'
import HealthCard from './HealthCard.vue'
import StatusChip from './StatusChip.vue'

const { data, loading, failed, load } = useLoader(fetchConnections)
onMounted(load)
defineExpose({ load })
</script>

<template>
  <HealthCard title="Conexiones" subtitle="Solo se comprueba que respondan; no se muestran credenciales." icon="mdi-lan-connect"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos comprobar las conexiones." @retry="load">
    <ul v-if="data" class="list">
      <li v-for="c in data" :key="c.key" class="item">
        <div class="item__name"><strong>{{ c.label }}</strong><span class="item__driver">{{ c.driver }}</span></div>
        <span v-if="c.latencyMs !== null" class="item__ms">{{ c.latencyMs }} ms</span>
        <StatusChip :status="c.status" :text="PROBE_TEXT[c.status]" />
      </li>
    </ul>
  </HealthCard>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; }
.item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
.item:first-child { border-top: 0; padding-top: 0; }
.item__name { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item__driver { font-size: 0.8125rem; color: var(--ink-500); }
.item__ms { font-size: 0.8125rem; color: var(--ink-500); white-space: nowrap; }
</style>
