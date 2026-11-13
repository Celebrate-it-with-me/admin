<script setup lang="ts">
import { onMounted } from 'vue'
import { useLoader } from '../useLoader'
import { fetchModules } from '../services/healthApi'
import { SECTION_TEXT } from '../logic'
import HealthCard from './HealthCard.vue'

const { data, loading, failed, load } = useLoader(fetchModules)
onMounted(load)
defineExpose({ load })
</script>

<template>
  <HealthCard title="Módulos y funciones" subtitle="Qué módulos del catálogo están encendidos y en qué planes. Para cambiarlos, ve a Módulos y planes." icon="mdi-toggle-switch-outline"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos cargar el catálogo de módulos." @retry="load">
    <template v-if="data">
      <p class="summary"><strong>{{ data.enabled }}</strong> encendidos <span class="text-medium-emphasis">·</span> <strong>{{ data.disabled }}</strong> apagados</p>
      <p v-if="!data.items.length" class="text-medium-emphasis">El catálogo está vacío.</p>
      <ul v-else class="list">
        <li v-for="m in data.items" :key="m.key" class="item">
          <div class="item__name">
            <strong>{{ m.key }}</strong>
            <span class="item__sub">{{ SECTION_TEXT[m.section] ?? m.section }}<template v-if="m.plans.length"> · {{ m.plans.join(', ') }}</template><template v-else> · sin planes</template></span>
          </div>
          <v-chip :color="m.isEnabled ? 'success' : 'default'" variant="tonal" size="small" :prepend-icon="m.isEnabled ? 'mdi-toggle-switch' : 'mdi-toggle-switch-off-outline'" class="font-weight-bold">
            {{ m.isEnabled ? 'Encendido' : 'Apagado' }}
          </v-chip>
        </li>
      </ul>
    </template>
  </HealthCard>
</template>

<style scoped>
.summary { margin: 0 0 8px; }
.list { list-style: none; margin: 0; padding: 0; }
.item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
.item__name { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item__name strong { overflow-wrap: anywhere; }
.item__sub { font-size: 0.8125rem; color: var(--ink-500); overflow-wrap: anywhere; }
</style>
