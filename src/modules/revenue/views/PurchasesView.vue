<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import PurchaseDetail from '../components/PurchaseDetail.vue'
import { fetchPurchases } from '../services/revenueApi'
import type { PurchaseFilters, PurchaseRow, Summary } from '../types'
import { EVENT_STATUS, GATEWAY, STATUS, dateLabel, emptyFilters, extraFilterCount, hasAnyFilter, money } from '../logic'

const { smAndDown } = useDisplay()

const filters = ref<PurchaseFilters>(emptyFilters())
const rows = ref<PurchaseRow[]>([])
const summary = ref<Summary | null>(null)
const total = ref(0)
const page = ref(1)
const perPage = ref(15)
const loading = ref(true)
const failed = ref(false)
const moreOpen = ref(false)
const selected = ref<number | null>(null)
const announce = ref('')

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const extraCount = computed(() => extraFilterCount(filters.value))
const filtered = computed(() => hasAnyFilter(filters.value))

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchPurchases(filters.value, page.value, perPage.value)
    if (request !== latest) return
    rows.value = res.data
    summary.value = res.summary
    total.value = res.meta.total
    announce.value = `${res.meta.total} ${res.meta.total === 1 ? 'compra' : 'compras'}`
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

// Typing waits a moment; the rest of the filters apply at once.
let timer: ReturnType<typeof setTimeout> | undefined
watch(() => [filters.value.search, filters.value.coupon], () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; load() }, 350)
})
watch(() => [filters.value.status, filters.value.gateway, filters.value.founder, filters.value.paidFrom, filters.value.paidTo, filters.value.createdFrom, filters.value.createdTo], () => {
  page.value = 1
  load()
})
watch([page, perPage], load)
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))

const clear = () => { filters.value = emptyFilters() }

const statusItems = Object.entries(STATUS).map(([value, s]) => ({ value, title: s.label }))
const gatewayItems = Object.entries(GATEWAY).map(([value, title]) => ({ value, title }))
const founderItems = [{ value: 'yes', title: 'Solo fundadoras' }, { value: 'no', title: 'Sin fundadoras' }]

const headers = [
  { title: 'Evento', key: 'event', sortable: false },
  { title: 'Compradora', key: 'buyer', sortable: false },
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Pasarela', key: 'gateway', sortable: false },
  { title: 'Importe', key: 'amount', sortable: false, align: 'end' as const },
  { title: 'Fecha', key: 'date', sortable: false },
]
const rowDate = (p: PurchaseRow) => dateLabel(p.paidAt ?? p.createdAt)
const open = (id: number) => { selected.value = id }
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Compras</h2>
      <p class="text-medium-emphasis">Todas las compras de eventos: pagadas, pendientes y reembolsadas. Solo lo ve la persona con rol superadmin.</p>
    </header>

    <div class="summary mb-4" aria-label="Resumen de lo filtrado">
      <v-card v-for="card in [
        { label: 'Compras', value: summary ? String(summary.count) : '', hint: filtered ? 'con estos filtros' : 'en total' },
        { label: 'Pagadas', value: summary ? String(summary.paidCount) : '', hint: 'compras cobradas' },
        { label: 'Ingresos', value: summary ? money(summary.revenueCents) : '', hint: 'de las pagadas' },
        { label: 'Reembolsos', value: summary ? money(summary.refundedCents) : '', hint: summary ? `${summary.refundedCount} ${summary.refundedCount === 1 ? 'compra' : 'compras'}` : '' },
      ]" :key="card.label" class="pa-4 stat" :class="{ 'is-loading': loading && summary }">
        <p class="stat__label">{{ card.label }}</p>
        <v-skeleton-loader v-if="!summary" type="heading" class="stat__skeleton" />
        <p v-else class="stat__value">{{ card.value }}</p>
        <p class="stat__hint">{{ card.hint }}</p>
      </v-card>
    </div>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="5">
          <v-text-field v-model="filters.search" label="Buscar por evento o correo" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="6" md="3">
          <v-select v-model="filters.status" :items="statusItems" label="Estado" clearable hide-details />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.gateway" :items="gatewayItems" label="Pasarela" clearable hide-details />
        </v-col>
        <v-col cols="12" md="2" class="d-flex align-center">
          <v-btn variant="text" :prepend-icon="moreOpen ? 'mdi-chevron-up' : 'mdi-tune-variant'" :aria-expanded="moreOpen" class="touch" @click="moreOpen = !moreOpen">
            Más filtros<span v-if="extraCount"> ({{ extraCount }})</span>
          </v-btn>
        </v-col>
      </v-row>
      <v-expand-transition>
        <v-row v-show="moreOpen" dense class="mt-1">
          <v-col cols="6" md="3"><v-select v-model="filters.founder" :items="founderItems" label="Fundadoras" clearable hide-details /></v-col>
          <v-col cols="6" md="3"><v-text-field v-model="filters.coupon" label="Código" clearable hide-details autocomplete="off" /></v-col>
          <v-col cols="6" md="3"><v-text-field v-model="filters.paidFrom" label="Pagada desde" type="date" hide-details /></v-col>
          <v-col cols="6" md="3"><v-text-field v-model="filters.paidTo" label="Pagada hasta" type="date" hide-details /></v-col>
          <v-col cols="6" md="3"><v-text-field v-model="filters.createdFrom" label="Creada desde" type="date" hide-details /></v-col>
          <v-col cols="6" md="3"><v-text-field v-model="filters.createdTo" label="Creada hasta" type="date" hide-details /></v-col>
        </v-row>
      </v-expand-transition>
      <div v-if="filtered" class="mt-3"><v-btn variant="text" prepend-icon="mdi-filter-off-outline" @click="clear">Quitar filtros</v-btn></div>
    </v-card>

    <p class="sr-only" aria-live="polite">{{ announce }}</p>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar las compras.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <!-- Phone: one card per purchase -->
    <div v-if="smAndDown" class="cards" :class="{ 'is-loading': loading && rows.length }" :aria-busy="loading">
      <template v-if="loading && !rows.length">
        <v-card v-for="n in 4" :key="n" class="pa-4"><v-skeleton-loader type="heading, text" /></v-card>
      </template>
      <v-card v-else-if="!rows.length && !failed" class="pa-6 text-center text-medium-emphasis">
        {{ filtered ? 'No hay compras con estos filtros.' : 'Todavía no hay compras.' }}
      </v-card>
      <v-card v-for="p in rows" :key="p.id" class="pa-4 pcard" role="button" tabindex="0" :aria-label="`Ver la compra ${p.id} de ${p.event?.name ?? 'evento'}`" @click="open(p.id)" @keydown.enter="open(p.id)">
        <div class="d-flex justify-space-between ga-3">
          <strong class="pcard__event">{{ p.event?.name ?? 'Evento eliminado' }}</strong>
          <strong class="nowrap">{{ money(p.amountCents, p.currency) }}</strong>
        </div>
        <p class="text-body-2 text-medium-emphasis pcard__buyer">{{ p.buyer?.email ?? '—' }}</p>
        <div class="d-flex align-center flex-wrap ga-2 mt-2">
          <v-chip :color="STATUS[p.status].color" variant="tonal" size="small" :prepend-icon="STATUS[p.status].icon">{{ STATUS[p.status].label }}</v-chip>
          <v-chip v-if="p.couponCode" size="small" variant="outlined">{{ p.couponCode }}</v-chip>
          <span class="text-body-2 text-medium-emphasis ml-auto">{{ rowDate(p) }}</span>
        </div>
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
        :no-data-text="filtered ? 'No hay compras con estos filtros.' : 'Todavía no hay compras.'"
        loading-text="Cargando…"
        hover
        @click:row="(_: Event, { item }: { item: PurchaseRow }) => open(item.id)"
      >
        <template #item.event="{ item }">
          <div class="cell-event">
            <strong>{{ item.event?.name ?? 'Evento eliminado' }}</strong><br>
            <span v-if="item.event" class="text-caption text-medium-emphasis">{{ EVENT_STATUS[item.event.status] ?? item.event.status }}</span>
          </div>
        </template>
        <template #item.buyer="{ item }">
          <div v-if="item.buyer" class="cell-event"><span>{{ item.buyer.name }}</span><br><span class="text-caption text-medium-emphasis">{{ item.buyer.email }}</span></div>
          <span v-else>—</span>
        </template>
        <template #item.status="{ item }">
          <v-chip :color="STATUS[item.status].color" variant="tonal" size="small" :prepend-icon="STATUS[item.status].icon">{{ STATUS[item.status].label }}</v-chip>
          <v-chip v-if="item.isFounder" color="primary" variant="tonal" size="x-small" class="ml-1">Fundador</v-chip>
        </template>
        <template #item.gateway="{ item }">{{ GATEWAY[item.gateway] ?? item.gateway }}</template>
        <template #item.amount="{ item }">
          <strong>{{ money(item.amountCents, item.currency) }}</strong>
          <div v-if="item.couponCode" class="text-caption text-medium-emphasis">{{ item.couponCode }}</div>
        </template>
        <template #item.date="{ item }"><span class="nowrap">{{ rowDate(item) }}</span></template>
      </v-data-table-server>
    </v-card>

    <PurchaseDetail :purchase-id="selected" @close="selected = null" @changed="load" />
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat__label { font-size: 0.875rem; font-weight: 600; color: var(--ink-500); }
.stat__value { font-family: var(--font-heading); font-size: 2rem; line-height: 1.15; margin: 6px 0 4px; color: var(--ink-900); }
.stat__skeleton { background: transparent; margin: 2px -16px; }
.stat__hint { font-size: 0.8125rem; color: var(--ink-500); }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.table-card :deep(tbody tr) { cursor: pointer; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.cell-event { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cards { display: flex; flex-direction: column; gap: 12px; }
.pcard { cursor: pointer; }
.pcard__event { overflow-wrap: anywhere; }
.pcard__buyer { overflow-wrap: anywhere; margin: 2px 0 0; }
.touch { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (max-width: 960px) { .summary { grid-template-columns: repeat(2, 1fr); gap: 12px; } .stat__value { font-size: 1.625rem; } }
</style>
