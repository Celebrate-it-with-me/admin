<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from 'vue'
import { fetchEvent } from '../services/eventsApi'
import EventChips from '../components/EventChips.vue'
import Summary from '../tabs/Summary.vue'
import Features from '../tabs/Features.vue'
import PlanPayment from '../tabs/PlanPayment.vue'
import Content from '../tabs/Content.vue'
import Actions from '../tabs/Actions.vue'
import Log from '../tabs/Log.vue'
import { dateLabel } from '../labels'
import type { EventDetail } from '../types'

const props = defineProps<{ id: string }>()

// `ready: true` tabs are shown disabled with "Pronto"; the next wave sets them to true and fills their file.
const TABS: { key: string; title: string; component: Component; ready: boolean }[] = [
  { key: 'summary', title: 'Resumen', component: Summary, ready: true },
  { key: 'features', title: 'Funciones', component: Features, ready: true },
  { key: 'plan', title: 'Plan y pago', component: PlanPayment, ready: true },
  { key: 'content', title: 'Contenido', component: Content, ready: true },
  { key: 'actions', title: 'Acciones', component: Actions, ready: true },
  { key: 'log', title: 'Registro', component: Log, ready: true },
]

const detail = ref<EventDetail | null>(null)
const loading = ref(true)
const error = ref<'notFound' | 'failed' | null>(null)
const tab = ref('summary')

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  error.value = null
  try {
    const res = await fetchEvent(props.id)
    if (request === latest) detail.value = res
  } catch (e) {
    if (request !== latest) return
    detail.value = null
    error.value = (e as { response?: { status?: number } }).response?.status === 404 ? 'notFound' : 'failed'
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)
watch(() => props.id, load)

const current = computed(() => TABS.find(t => t.key === tab.value)?.component)
const deleted = computed(() => Boolean(detail.value?.event.deletedAt))
</script>

<template>
  <section>
    <v-btn to="/dashboard/events" variant="text" prepend-icon="mdi-arrow-left" class="mb-3 back">Volver a eventos</v-btn>

    <v-card v-if="loading && !detail" class="pa-6" aria-busy="true">
      <v-skeleton-loader type="heading, text, text" />
    </v-card>

    <v-card v-else-if="error === 'notFound'" class="pa-8 text-center">
      <v-icon icon="mdi-calendar-remove-outline" size="40" color="secondary" class="mb-2" aria-hidden="true" />
      <h2 class="text-h6 mb-1">No encontramos este evento</h2>
      <p class="text-medium-emphasis mb-4">Puede que el número esté mal o que se haya eliminado del todo.</p>
      <v-btn color="primary" to="/dashboard/events">Ver todos los eventos</v-btn>
    </v-card>

    <v-alert v-else-if="error === 'failed'" type="error" variant="tonal" text="No pudimos cargar el evento.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <template v-else-if="detail">
      <v-alert v-if="deleted" type="error" variant="tonal" class="mb-4" icon="mdi-delete-outline"
        :text="`Este evento fue eliminado el ${dateLabel(detail.event.deletedAt)}. Solo se muestra para consulta.`" />
      <v-alert v-else-if="detail.event.status === 'archived'" type="info" variant="tonal" class="mb-4" icon="mdi-archive-outline"
        text="Este evento está archivado: la invitación no es visible para los invitados." />

      <header class="head mb-4" :class="{ 'is-loading': loading }">
        <h2 class="title">{{ detail.event.name }}</h2>
        <p class="text-medium-emphasis">Evento #{{ detail.event.id }}<template v-if="detail.event.startDate"> · {{ dateLabel(detail.event.startDate, true) }}</template></p>
        <EventChips :status="detail.event.status" :stage="detail.event.stage" :plan="detail.plan" class="mt-2" />
      </header>

      <v-tabs v-model="tab" color="primary" show-arrows class="mb-4 tabs" aria-label="Secciones del evento">
        <v-tab v-for="t in TABS" :key="t.key" :value="t.key" :disabled="!t.ready" class="tab">
          {{ t.title }}<v-chip v-if="!t.ready" size="x-small" variant="tonal" class="ml-2">Pronto</v-chip>
        </v-tab>
      </v-tabs>

      <component :is="current" :detail="detail" @reload="load" />
    </template>
  </section>
</template>

<style scoped>
.back { min-height: 44px; }
.head { transition: opacity 0.15s ease-out; }
.is-loading { opacity: 0.55; }
.title { font-size: 2rem; line-height: 1.2; margin: 0 0 4px; overflow-wrap: anywhere; }
.min-w-0 { min-width: 0; }
.tabs { border-bottom: 1px solid var(--line); }
.tab { min-height: 44px; }
</style>
