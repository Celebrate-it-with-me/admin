<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import InvoiceDetail from '../components/InvoiceDetail.vue'
import { fetchInvoices } from '../services/invoicesApi'
import type { InvoiceFilters, InvoiceRow } from '../types'
import { STATUS, dateLabel, emptyFilters, hasAnyFilter, money } from '../logic'

const { smAndDown } = useDisplay()

const filters = ref<InvoiceFilters>(emptyFilters())
const rows = ref<InvoiceRow[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(15)
const loading = ref(true)
const failed = ref(false)
const selected = ref<number | null>(null)
const announce = ref('')

const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))
const filtered = computed(() => hasAnyFilter(filters.value))

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchInvoices(filters.value, page.value, perPage.value)
    if (request !== latest) return
    rows.value = res.data
    total.value = res.meta.total
    announce.value = `${res.meta.total} ${res.meta.total === 1 ? 'factura' : 'facturas'}`
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(() => filters.value.search, () => {
  clearTimeout(timer)
  timer = setTimeout(() => { page.value = 1; load() }, 350)
})
watch(() => [filters.value.status, filters.value.from, filters.value.to], () => { page.value = 1; load() })
watch([page, perPage], load)
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))

const clear = () => { filters.value = emptyFilters() }
const statusItems = Object.entries(STATUS).map(([value, s]) => ({ value, title: s.label }))

const headers = [
  { title: 'Número', key: 'number', sortable: false },
  { title: 'Facturada a', key: 'recipient', sortable: false },
  { title: 'Evento', key: 'event', sortable: false },
  { title: 'Estado', key: 'status', sortable: false },
  { title: 'Total', key: 'total', sortable: false, align: 'end' as const },
  { title: 'Emitida', key: 'issuedAt', sortable: false },
]
const open = (id: number) => { selected.value = id }
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Facturas</h2>
      <p class="text-medium-emphasis">Se emiten solas al confirmarse cada pago. Son inmutables: un reembolso las anula con una nota de crédito. Solo lo ve la persona con rol superadmin.</p>
    </header>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="5">
          <v-text-field v-model="filters.search" label="Buscar por número, nombre o correo" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="12" md="3"><v-select v-model="filters.status" :items="statusItems" label="Estado" clearable hide-details /></v-col>
        <v-col cols="6" md="2"><v-text-field v-model="filters.from" label="Desde" type="date" hide-details /></v-col>
        <v-col cols="6" md="2"><v-text-field v-model="filters.to" label="Hasta" type="date" hide-details /></v-col>
      </v-row>
      <div v-if="filtered" class="mt-3"><v-btn variant="text" prepend-icon="mdi-filter-off-outline" @click="clear">Quitar filtros</v-btn></div>
    </v-card>

    <p class="sr-only" aria-live="polite">{{ announce }}</p>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar las facturas.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <!-- Phone: one card per invoice -->
    <div v-if="smAndDown" class="cards" :class="{ 'is-loading': loading && rows.length }" :aria-busy="loading">
      <template v-if="loading && !rows.length">
        <v-card v-for="n in 4" :key="n" class="pa-4"><v-skeleton-loader type="heading, text" /></v-card>
      </template>
      <v-card v-else-if="!rows.length && !failed" class="pa-6 text-center text-medium-emphasis">
        {{ filtered ? 'No hay facturas con estos filtros.' : 'Todavía no hay facturas.' }}
      </v-card>
      <v-card v-for="i in rows" :key="i.id" class="pa-4 icard" role="button" tabindex="0" :aria-label="`Ver la factura ${i.number}`" @click="open(i.id)" @keydown.enter="open(i.id)">
        <div class="d-flex justify-space-between ga-3">
          <strong class="icard__num">{{ i.number }}</strong>
          <strong class="nowrap">{{ money(i.totalCents, i.currency) }}</strong>
        </div>
        <p class="text-body-2 text-medium-emphasis icard__line">{{ i.recipient.name ?? '—' }} · {{ i.event?.name ?? 'Evento eliminado' }}</p>
        <div class="d-flex align-center flex-wrap ga-2 mt-2">
          <v-chip :color="STATUS[i.status].color" variant="tonal" size="small" :prepend-icon="STATUS[i.status].icon">{{ STATUS[i.status].label }}</v-chip>
          <span class="text-body-2 text-medium-emphasis ml-auto">{{ dateLabel(i.issuedAt) }}</span>
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
        :no-data-text="filtered ? 'No hay facturas con estos filtros.' : 'Todavía no hay facturas.'"
        loading-text="Cargando…"
        hover
        @click:row="(_: Event, { item }: { item: InvoiceRow }) => open(item.id)"
      >
        <template #item.number="{ item }"><strong class="nowrap">{{ item.number }}</strong></template>
        <template #item.recipient="{ item }">
          <div class="cell"><span>{{ item.recipient.name ?? '—' }}</span><br><span class="text-caption text-medium-emphasis">{{ item.recipient.email }}</span></div>
        </template>
        <template #item.event="{ item }"><div class="cell">{{ item.event?.name ?? 'Evento eliminado' }}</div></template>
        <template #item.status="{ item }">
          <v-chip :color="STATUS[item.status].color" variant="tonal" size="small" :prepend-icon="STATUS[item.status].icon">{{ STATUS[item.status].label }}</v-chip>
        </template>
        <template #item.total="{ item }"><strong>{{ money(item.totalCents, item.currency) }}</strong></template>
        <template #item.issuedAt="{ item }"><span class="nowrap">{{ dateLabel(item.issuedAt) }}</span></template>
      </v-data-table-server>
    </v-card>

    <InvoiceDetail :invoice-id="selected" @close="selected = null" @changed="load" />
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.table-card :deep(tbody tr) { cursor: pointer; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.cell { max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cards { display: flex; flex-direction: column; gap: 12px; }
.icard { cursor: pointer; }
.icard__num { overflow-wrap: anywhere; }
.icard__line { overflow-wrap: anywhere; margin: 2px 0 0; }
.touch { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
