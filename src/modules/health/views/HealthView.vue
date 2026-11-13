<script setup lang="ts">
import { ref } from 'vue'
import ConnectionsCard from '../components/ConnectionsCard.vue'
import ErrorsCard from '../components/ErrorsCard.vue'
import FailedJobsCard from '../components/FailedJobsCard.vue'
import ModulesCard from '../components/ModulesCard.vue'
import QueuesCard from '../components/QueuesCard.vue'

const cards = ref<{ load: () => Promise<void> }[]>([])
const refreshing = ref(false)
const announce = ref('')

const refreshAll = async () => {
  refreshing.value = true
  await Promise.all(cards.value.map(c => c.load()))
  refreshing.value = false
  announce.value = 'Salud del sistema actualizada.'
}
const setCard = (el: unknown) => { if (el) cards.value.push(el as { load: () => Promise<void> }) }
</script>

<template>
  <section>
    <header class="head mb-6">
      <div>
        <h2 class="title">Salud del sistema</h2>
        <p class="text-medium-emphasis">Cómo está funcionando la plataforma ahora mismo. Solo lectura: en esta versión no se puede reintentar ni borrar nada.</p>
      </div>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" class="touch" :loading="refreshing" @click="refreshAll">Actualizar todo</v-btn>
    </header>
    <p class="sr-only" aria-live="polite">{{ announce }}</p>

    <div class="grid">
      <ConnectionsCard :ref="setCard" />
      <QueuesCard :ref="setCard" />
      <FailedJobsCard :ref="setCard" class="wide" />
      <ErrorsCard :ref="setCard" class="wide" />
      <ModulesCard :ref="setCard" class="wide" />
    </div>
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
.wide { grid-column: 1 / -1; }
.touch { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 960px) {
  .head { flex-direction: column; align-items: stretch; }
  .grid { grid-template-columns: minmax(0, 1fr); }
  .title { font-size: 1.625rem; }
}
</style>
