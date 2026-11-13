<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { supportService } from '../services/supportService'
import type { AssignFilter, StatusCounts, SupportRow, SupportStatus } from '../types'
import { STATUSES, ageLabel, buildParams, preview, statusInfo } from '../utils'

const router = useRouter()
const { smAndDown } = useDisplay()

const rows = ref<SupportRow[]>([])
const total = ref(0)
const lastPage = ref(1)
const counts = ref<StatusCounts>({ new: 0, in_progress: 0, resolved: 0 })
const loading = ref(true)
const failed = ref(false)

const status = ref<SupportStatus>('new')
const assigned = ref<AssignFilter>('all')
const search = ref('')
const page = ref(1)
const perPage = 25

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await supportService.list(buildParams({ status: status.value, assigned: assigned.value, search: search.value, page: page.value, perPage }))
    if (request !== latest) return
    rows.value = res.data
    total.value = res.meta.total
    lastPage.value = res.meta.lastPage
    counts.value = res.meta.counts
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

// Search waits for a pause in typing; tabs and the assignment filter go back to page 1.
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load() }, 350) })
watch([status, assigned], () => { page.value = 1; load() })
watch(page, load)
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))

const open = (id: number) => router.push({ name: 'SupportDetail', params: { id } })
const hasFilters = computed(() => assigned.value !== 'all' || search.value.trim() !== '')
const clear = () => { assigned.value = 'all'; search.value = '' }
const emptyText = computed(() => hasFilters.value
  ? 'No hay solicitudes con estos filtros.'
  : status.value === 'new' ? 'No hay solicitudes nuevas. Todo al día.' : status.value === 'in_progress' ? 'No hay solicitudes en curso.' : 'Todavía no hay solicitudes resueltas.')
const showing = computed(() => (total.value ? `${(page.value - 1) * perPage + 1}–${(page.value - 1) * perPage + rows.value.length} de ${total.value}` : ''))
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Soporte</h2>
      <p class="text-medium-emphasis">Las solicitudes de ayuda que llegan desde la app, con el contexto ya adjunto.</p>
    </header>

    <v-tabs v-model="status" color="primary" class="mb-4 tabs" show-arrows aria-label="Estado de las solicitudes">
      <v-tab v-for="s in STATUSES" :key="s.value" :value="s.value" class="tab">
        {{ s.label }}
        <v-chip size="x-small" class="ml-2" :color="s.value === status ? s.color : undefined" variant="tonal" :aria-label="`${counts[s.value]} solicitudes`">{{ counts[s.value] }}</v-chip>
      </v-tab>
    </v-tabs>

    <v-card class="pa-4 mb-4">
      <v-row dense align="center">
        <v-col cols="12" md="5">
          <v-text-field v-model="search" label="Buscar por mensaje, nombre o correo" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="12" md="5">
          <v-btn-toggle v-model="assigned" mandatory divided color="primary" variant="outlined" density="comfortable" class="toggle" aria-label="Asignación">
            <v-btn value="all">Todas</v-btn>
            <v-btn value="me">Asignadas a mí</v-btn>
            <v-btn value="none">Sin asignar</v-btn>
          </v-btn-toggle>
        </v-col>
        <v-col cols="12" md="2" class="d-flex justify-end">
          <v-btn v-if="hasFilters" variant="text" prepend-icon="mdi-filter-off-outline" @click="clear">Quitar filtros</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar las solicitudes.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <v-card class="list-card" :class="{ 'is-loading': loading && rows.length }" aria-live="polite" :aria-busy="loading">
      <div v-if="loading && !rows.length && !failed" class="pa-2"><v-skeleton-loader type="list-item-three-line@4" /></div>
      <div v-else-if="!rows.length && !failed" class="empty">
        <v-icon icon="mdi-lifebuoy" size="40" color="secondary" class="mb-2" />
        <p class="text-medium-emphasis">{{ emptyText }}</p>
      </div>
      <ul v-else class="list">
        <li v-for="r in rows" :key="r.id">
          <button type="button" class="item" @click="open(r.id)">
            <span class="item__top">
              <v-chip :color="statusInfo(r.status).color" variant="tonal" size="small" :prepend-icon="statusInfo(r.status).icon">{{ statusInfo(r.status).label }}</v-chip>
              <span class="text-caption text-medium-emphasis nowrap">{{ ageLabel(r.createdAt) }}</span>
            </span>
            <span class="item__msg">{{ preview(r.message, smAndDown ? 100 : 180) }}</span>
            <span class="item__meta">
              <span><v-icon icon="mdi-account-outline" size="16" /> {{ r.user?.name ?? 'Cuenta eliminada' }}</span>
              <span v-if="r.event"><v-icon icon="mdi-party-popper" size="16" /> {{ r.event.name }}</span>
              <span><v-icon icon="mdi-account-check-outline" size="16" /> {{ r.assignedTo ? r.assignedTo.name : 'Sin asignar' }}</span>
              <span v-if="r.notesCount"><v-icon icon="mdi-note-text-outline" size="16" /> {{ r.notesCount }} {{ r.notesCount === 1 ? 'nota' : 'notas' }}</span>
            </span>
          </button>
        </li>
      </ul>
    </v-card>

    <nav v-if="lastPage > 1" class="pager" aria-label="Páginas">
      <span class="text-body-2 text-medium-emphasis">{{ showing }}</span>
      <v-pagination v-model="page" :length="lastPage" :total-visible="smAndDown ? 3 : 7" density="comfortable" />
    </nav>
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.tab { min-height: 44px; }
.toggle { flex-wrap: wrap; height: auto; max-width: 100%; }
.toggle .v-btn { min-height: 44px; }
.list-card { overflow: hidden; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.empty { text-align: center; padding: 48px 16px; }
.list { list-style: none; margin: 0; padding: 0; }
.list li + li { border-top: 1px solid var(--line); }
.item { border: 0; border-radius: 0; display: flex; flex-direction: column; gap: 6px; width: 100%; text-align: left; padding: 16px; min-height: 44px; background: transparent; cursor: pointer; font: inherit; color: inherit; }
.item:hover { background: var(--cream-100); }
.item:focus-visible { outline: 2px solid var(--rose-600); outline-offset: -2px; }
.item__top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.item__msg { font-weight: 500; overflow-wrap: anywhere; }
.item__meta { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 0.8125rem; color: var(--ink-500); }
.item__meta span { display: inline-flex; align-items: center; gap: 4px; min-width: 0; overflow-wrap: anywhere; }
.nowrap { white-space: nowrap; }
.pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-top: 16px; }
</style>
