<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import EventChips from '../components/EventChips.vue'
import { fetchEvents } from '../services/eventsApi'
import { dateLabel, emptyFilters, hasActiveFilters, PLAN_OPTIONS, SORT_OPTIONS, STAGE_OPTIONS, STATUS_OPTIONS, TYPE_OPTIONS, typeName } from '../labels'
import type { EventFilters, EventRow } from '../types'

const router = useRouter()
const { smAndDown } = useDisplay()

const rows = ref<EventRow[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const loading = ref(true)
const failed = ref(false)
const showFilters = ref(false)

const filters = ref<EventFilters>(emptyFilters())
const active = computed(() => hasActiveFilters(filters.value))
// The search box waits for a pause in typing before asking the server.
const searchText = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(searchText, value => {
  clearTimeout(timer)
  timer = setTimeout(() => { filters.value = { ...filters.value, search: value } }, 400)
})
onBeforeUnmount(() => clearTimeout(timer))

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchEvents(filters.value, page.value, perPage.value)
    if (request !== latest) return
    rows.value = res.data
    total.value = res.meta.total
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

onMounted(load)
watch(filters, () => { page.value = 1; load() }, { deep: true })
watch([page, perPage], load)

const clear = () => { searchText.value = ''; clearTimeout(timer); filters.value = emptyFilters() }
const open = (id: number) => router.push(`/dashboard/events/${id}`)
const pages = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const showSkeleton = computed(() => loading.value && !rows.value.length)
const resultText = computed(() => loading.value ? 'Buscando eventos…' : failed.value ? '' : `${total.value} ${total.value === 1 ? 'evento' : 'eventos'}`)

const headers = [
  { title: 'Evento', key: 'name', sortable: false },
  { title: 'Dueña', key: 'owner', sortable: false },
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Fecha', key: 'startDate', sortable: false },
  { title: 'Invitados', key: 'guestCount', sortable: false, align: 'end' as const },
]
</script>

<template>
  <section>
    <p class="text-medium-emphasis mb-6 lead">Todos los eventos de la plataforma. Busca por nombre, enlace, dueña o correo y abre la ficha para ver el detalle.</p>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="5">
          <v-text-field v-model="searchText" label="Buscar" placeholder="Nombre, enlace, dueña o correo" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="8" md="4">
          <v-select v-model="filters.sort" :items="SORT_OPTIONS" item-title="title" item-value="value" label="Ordenar por" hide-details />
        </v-col>
        <v-col cols="4" md="3" class="d-flex align-center">
          <v-btn variant="tonal" class="filter-btn" prepend-icon="mdi-filter-variant" :aria-expanded="showFilters" aria-controls="event-filters" @click="showFilters = !showFilters">Filtros</v-btn>
        </v-col>
      </v-row>

      <v-expand-transition>
        <div v-show="showFilters" id="event-filters">
          <v-row dense class="mt-1">
            <v-col cols="6" md="3"><v-select v-model="filters.status" :items="STATUS_OPTIONS" label="Estado" clearable hide-details /></v-col>
            <v-col cols="6" md="3"><v-select v-model="filters.stage" :items="STAGE_OPTIONS" label="Etapa" clearable hide-details /></v-col>
            <v-col cols="6" md="3"><v-select v-model="filters.plan" :items="PLAN_OPTIONS" label="Plan" clearable hide-details /></v-col>
            <v-col cols="6" md="3"><v-select v-model="filters.type" :items="TYPE_OPTIONS" label="Tipo" clearable hide-details /></v-col>
            <v-col cols="6" md="3"><v-text-field v-model="filters.from" label="Evento desde" type="date" hide-details /></v-col>
            <v-col cols="6" md="3"><v-text-field v-model="filters.to" label="Evento hasta" type="date" hide-details /></v-col>
            <v-col cols="12" md="6" class="d-flex flex-wrap align-center column-gap-4">
              <v-checkbox v-model="filters.paymentPending" label="Con pago pendiente" hide-details density="comfortable" />
              <v-checkbox v-model="filters.internal" label="Incluir cuentas internas" hide-details density="comfortable" />
            </v-col>
          </v-row>
        </div>
      </v-expand-transition>

      <div class="d-flex align-center justify-space-between mt-3">
        <p class="text-body-2 text-medium-emphasis" aria-live="polite">{{ resultText }}</p>
        <v-btn v-if="active" variant="text" prepend-icon="mdi-filter-off-outline" @click="clear">Quitar filtros</v-btn>
      </div>
    </v-card>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar los eventos.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <!-- Desktop: table -->
    <v-card v-if="!smAndDown" class="table-card" :class="{ 'is-loading': loading && rows.length }">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="perPage"
        :headers="headers"
        :items="rows"
        :items-length="total"
        :loading="showSkeleton"
        item-value="id"
        :items-per-page-options="[10, 25, 50]"
        items-per-page-text="Por página"
        :no-data-text="active ? 'Ningún evento coincide con estos filtros.' : 'Todavía no hay eventos.'"
        loading-text="Cargando…"
        hover
        @click:row="(_: Event, { item }: { item: EventRow }) => open(item.id)"
      >
        <template #item.name="{ item }">
          <router-link :to="`/dashboard/events/${item.id}`" class="name-link" @click.stop>{{ item.name }}</router-link>
          <br><span class="text-caption text-medium-emphasis">{{ typeName(item.type) }}<template v-if="item.slug"> · /{{ item.slug }}</template></span>
        </template>
        <template #item.owner="{ item }">
          <div v-if="item.owner"><strong>{{ item.owner.name }}</strong><br><span class="text-caption text-medium-emphasis">{{ item.owner.email }}</span></div>
          <span v-else class="text-medium-emphasis">Sin dueña</span>
        </template>
        <template #item.status="{ item }"><EventChips :status="item.status" :stage="item.stage" :plan="item.plan" :purchase="item.lastPurchaseStatus === 'paid' ? null : item.lastPurchaseStatus" /></template>
        <template #item.startDate="{ item }"><span class="nowrap">{{ dateLabel(item.startDate) }}</span></template>
      </v-data-table-server>
    </v-card>

    <!-- Phone: cards -->
    <div v-else>
      <ul v-if="showSkeleton" class="cards" aria-hidden="true">
        <li v-for="n in 4" :key="n"><v-skeleton-loader type="article" /></li>
      </ul>
      <v-card v-else-if="!rows.length && !failed" class="pa-6 text-center text-medium-emphasis">
        {{ active ? 'Ningún evento coincide con estos filtros.' : 'Todavía no hay eventos.' }}
      </v-card>
      <ul v-else class="cards" :class="{ 'is-loading': loading }">
        <li v-for="e in rows" :key="e.id">
          <v-card class="event-card" :to="`/dashboard/events/${e.id}`">
            <div class="d-flex justify-space-between ga-3">
              <div class="min-w-0">
                <p class="font-weight-bold card-title">{{ e.name }}</p>
                <p class="text-caption text-medium-emphasis">{{ typeName(e.type) }} · {{ dateLabel(e.startDate) }}</p>
              </div>
              <span class="guests text-body-2"><v-icon icon="mdi-account-multiple-outline" size="18" aria-label="Invitados" /> {{ e.guestCount }}</span>
            </div>
            <p class="text-body-2 mt-2 owner">{{ e.owner ? `${e.owner.name} · ${e.owner.email}` : 'Sin dueña' }}</p>
            <div class="mt-3"><EventChips :status="e.status" :stage="e.stage" :plan="e.plan" :purchase="e.lastPurchaseStatus === 'paid' ? null : e.lastPurchaseStatus" /></div>
          </v-card>
        </li>
      </ul>
      <v-pagination v-if="pages > 1" v-model="page" :length="pages" :total-visible="3" class="mt-4" />
    </div>
  </section>
</template>

<style scoped>
.lead { max-width: 60ch; }
.filter-btn { min-height: 44px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.table-card :deep(tbody tr) { cursor: pointer; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.name-link { color: var(--ink-900); font-weight: 700; text-decoration: none; }
.name-link:hover, .name-link:focus-visible { color: var(--rose-700); text-decoration: underline; }
.cards { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; transition: opacity 0.15s ease-out; }
.event-card { padding: 16px; min-height: 44px; }
.card-title { overflow-wrap: anywhere; }
.owner { overflow-wrap: anywhere; }
.guests { white-space: nowrap; }
.min-w-0 { min-width: 0; }
</style>
