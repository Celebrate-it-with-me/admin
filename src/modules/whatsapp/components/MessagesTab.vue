<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import MessageDetail from './MessageDetail.vue'
import MessageStatusChip from './MessageStatusChip.vue'
import { listMessages, searchEvents } from '../services/whatsappApi'
import { dateTimeLabel, emptyMessageFilters, hasMessageFilters, LOCALE_NAMES, MESSAGE_STATUS, TEMPLATE_KEYS, TEMPLATE_NAMES } from '../logic'
import type { MessageFilters, MessageStatus, PeriodFilter, TemplateKey, WaMessage } from '../types'

const props = defineProps<{ period: PeriodFilter }>()
const emit = defineEmits<{ clearPeriod: [] }>()
const { smAndDown } = useDisplay()

const filters = ref<MessageFilters>(emptyMessageFilters())
const rows = ref<WaMessage[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(15)
const loading = ref(true)
const failed = ref(false)
const selected = ref<WaMessage | null>(null)
const announce = ref('')

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const filtered = computed(() => hasMessageFilters(filters.value, props.period))

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await listMessages(filters.value, props.period, page.value, perPage.value)
    if (request !== latest) return
    rows.value = res.data
    total.value = res.meta.total
    announce.value = `${res.meta.total} ${res.meta.total === 1 ? 'mensaje' : 'mensajes'}`
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(() => filters.value.q, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; load() }, 350)
})
watch(() => [filters.value.status, filters.value.eventId, filters.value.templateKey, props.period.from, props.period.to], () => { page.value = 1; load() })
watch([page, perPage], load)
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))
defineExpose({ load })

const clear = () => { filters.value = emptyMessageFilters(); emit('clearPeriod') }

const statusItems = (Object.keys(MESSAGE_STATUS) as MessageStatus[]).map(value => ({ value, title: MESSAGE_STATUS[value].label }))
const templateItems = TEMPLATE_KEYS.map((value: TemplateKey) => ({ value, title: TEMPLATE_NAMES[value] }))

// Event filter: search as you type.
const eventItems = ref<{ id: number; name: string }[]>([])
const eventSearch = ref('')
let eventTimer: ReturnType<typeof setTimeout> | undefined
const loadEvents = async (q: string) => { try { eventItems.value = await searchEvents(q) } catch { eventItems.value = [] } }
watch(eventSearch, q => { clearTimeout(eventTimer); eventTimer = setTimeout(() => loadEvents(q ?? ''), 300) })
onMounted(() => loadEvents(''))
onBeforeUnmount(() => clearTimeout(eventTimer))

const headers = [
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Invitado', key: 'guest', sortable: false },
  { title: 'Teléfono', key: 'to', sortable: false },
  { title: 'Evento', key: 'event', sortable: false },
  { title: 'Plantilla', key: 'template', sortable: false },
  { title: 'Fecha', key: 'queuedAt', sortable: false },
]
const open = (m: WaMessage) => { selected.value = m }
</script>

<template>
  <div>
    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-text-field v-model="filters.q" label="Buscar por teléfono o nombre" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="6" md="2"><v-select v-model="filters.status" :items="statusItems" label="Estado" clearable hide-details /></v-col>
        <v-col cols="6" md="3"><v-select v-model="filters.templateKey" :items="templateItems" label="Plantilla" clearable hide-details /></v-col>
        <v-col cols="12" md="3">
          <v-autocomplete
            v-model="filters.eventId"
            v-model:search="eventSearch"
            :items="eventItems"
            item-title="name"
            item-value="id"
            label="Evento"
            clearable
            hide-details
            no-filter
            no-data-text="No hay eventos con ese nombre."
          />
        </v-col>
      </v-row>
      <div v-if="filtered" class="mt-3"><v-btn variant="text" prepend-icon="mdi-filter-off-outline" class="touch" @click="clear">Quitar filtros</v-btn></div>
    </v-card>

    <p class="sr-only" aria-live="polite">{{ announce }}</p>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar los mensajes.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <!-- Phone: one card per message -->
    <div v-if="smAndDown" class="cards" :class="{ 'is-loading': loading && rows.length }" :aria-busy="loading">
      <template v-if="loading && !rows.length && !failed">
        <v-card v-for="n in 4" :key="n" class="pa-4"><v-skeleton-loader type="heading, text" /></v-card>
      </template>
      <v-card v-else-if="!rows.length && !failed" class="pa-6 text-center text-medium-emphasis" data-testid="empty">
        <v-icon size="36" icon="mdi-message-off-outline" color="primary" class="mb-2" />
        <p>{{ filtered ? 'No hay mensajes con estos filtros.' : 'Todavía no se ha enviado ningún mensaje.' }}</p>
      </v-card>
      <v-card v-for="m in rows" :key="m.id" class="pa-4 mcard" role="button" tabindex="0" :aria-label="`Ver el mensaje ${m.id}`" :data-message="m.id" @click="open(m)" @keydown.enter="open(m)">
        <div class="d-flex justify-space-between align-start ga-3">
          <strong class="mcard__name">{{ m.guestName ?? 'Envío de prueba' }}</strong>
          <MessageStatusChip kind="message" :status="m.status" :error-code="m.errorCode" />
        </div>
        <p class="text-body-2 text-medium-emphasis mcard__line">{{ m.to }} · {{ m.eventName ?? 'Sin evento' }}</p>
        <p class="text-body-2 text-medium-emphasis mcard__line">{{ TEMPLATE_NAMES[m.templateKey] }} · {{ LOCALE_NAMES[m.locale] }} · {{ dateTimeLabel(m.queuedAt) }}</p>
      </v-card>
      <div v-if="total > perPage" class="d-flex align-center justify-space-between">
        <v-btn variant="text" prepend-icon="mdi-chevron-left" :disabled="page <= 1 || loading" class="touch" @click="page--">Anterior</v-btn>
        <span class="text-body-2">Página {{ page }} de {{ lastPage }}</span>
        <v-btn variant="text" append-icon="mdi-chevron-right" :disabled="page >= lastPage || loading" class="touch" @click="page++">Siguiente</v-btn>
      </div>
    </div>

    <!-- Desktop: server-side table -->
    <v-card v-else class="table-card" :class="{ 'is-loading': loading && rows.length }">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="perPage"
        :headers="headers"
        :items="rows"
        :items-length="total"
        :loading="loading && !rows.length"
        item-value="id"
        :items-per-page-options="[15, 25, 50]"
        items-per-page-text="Por página"
        :no-data-text="filtered ? 'No hay mensajes con estos filtros.' : 'Todavía no se ha enviado ningún mensaje.'"
        loading-text="Cargando…"
        hover
        @click:row="(_: Event, { item }: { item: WaMessage }) => open(item)"
      >
        <template #item.status="{ item }"><MessageStatusChip kind="message" :status="item.status" :error-code="item.errorCode" /></template>
        <template #item.guest="{ item }"><div class="cell">{{ item.guestName ?? 'Envío de prueba' }}</div></template>
        <template #item.to="{ item }"><span class="nowrap">{{ item.to }}</span></template>
        <template #item.event="{ item }"><div class="cell">{{ item.eventName ?? '—' }}</div></template>
        <template #item.template="{ item }"><span class="nowrap">{{ TEMPLATE_NAMES[item.templateKey] }} · {{ item.locale.toUpperCase() }}</span></template>
        <template #item.queuedAt="{ item }"><span class="nowrap">{{ dateTimeLabel(item.queuedAt) }}</span></template>
      </v-data-table-server>
    </v-card>

    <MessageDetail :message="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.table-card :deep(tbody tr) { cursor: pointer; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.cell { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cards { display: flex; flex-direction: column; gap: 12px; }
.mcard { cursor: pointer; }
.mcard__name { overflow-wrap: anywhere; }
.mcard__line { margin: 4px 0 0; overflow-wrap: anywhere; }
.touch { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
