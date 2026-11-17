<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useLoader } from '@/modules/health/useLoader'
import { adminVersion, fetchApiVersion, fetchAppVersion, useMock } from '../services/versionsApi'
import { normalizeApi, normalizeStatic } from '../logic'
import VersionCard from '../components/VersionCard.vue'

const api = useLoader(async () => normalizeApi(await fetchApiVersion()))
const app = useLoader(async () => normalizeStatic(await fetchAppVersion()))
const admin = useLoader(async () => normalizeStatic(adminVersion()))

const adminInfo = computed(() => admin.data.value && { ...admin.data.value, environment: api.data.value?.environment ?? null })
const refreshing = computed(() => api.loading.value || app.loading.value || admin.loading.value)
const announce = ref('')

const refreshAll = async () => {
  await Promise.all([api.load(), app.load(), admin.load()])
  announce.value = 'Versiones actualizadas.'
}
onMounted(refreshAll)
</script>

<template>
  <section>
    <header class="head mb-6">
      <div>
        <h2 class="title">Versiones</h2>
        <p class="text-medium-emphasis">Qué versión de cada servicio está funcionando: la API, la app de organizadoras e invitados y este panel.</p>
      </div>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" class="touch" :loading="refreshing" @click="refreshAll">Actualizar</v-btn>
    </header>
    <p class="sr-only" aria-live="polite">{{ announce }}</p>
    <v-alert v-if="useMock" type="warning" variant="tonal" density="compact" class="mb-4" text="Datos de prueba (mock): la API y la app no se están consultando." />

    <div class="grid">
      <VersionCard title="API" subtitle="Laravel · servidor" icon="mdi-api" show-runtime
        :loading="api.loading.value" :failed="api.failed.value" :info="api.data.value" @retry="api.load" />
      <VersionCard title="App" subtitle="Organizadoras e invitados" icon="mdi-cellphone"
        :loading="app.loading.value" :failed="app.failed.value" :info="app.data.value" @retry="app.load" />
      <VersionCard title="Admin" subtitle="Este panel" icon="mdi-shield-account-outline"
        :loading="admin.loading.value" :failed="admin.failed.value" :info="adminInfo" @retry="admin.load" />
    </div>
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
.touch { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 1100px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 960px) {
  .head { flex-direction: column; align-items: stretch; }
  .grid { grid-template-columns: minmax(0, 1fr); }
  .title { font-size: 1.625rem; }
}
</style>
