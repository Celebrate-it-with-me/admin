<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { API } from '@/services/axios'
import { useCurrentUserStore } from '@/store/currentUser'
import { ROLE_LABELS } from '@/composables/useAuditLabels'
import UserFormDialog from '../components/UserFormDialog.vue'
import { buildListParams, dateLabel } from '../helpers'
import type { UserFilters, UserRow } from '../types'

const router = useRouter()
const me = useCurrentUserStore()
const { smAndDown } = useDisplay()

const rows = ref<UserRow[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const loading = ref(true)
const failed = ref(false)
const filters = ref<UserFilters>({ search: '', kind: null, status: null, internal: false })
const hasFilters = computed(() => !!(filters.value.search || filters.value.kind || filters.value.status || filters.value.internal))

// Internal accounts (demo and staff) are left out by default: how many, so the screen can say so.
const hiddenInternal = ref(0)

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await API.get('users', { params: buildListParams(filters.value, page.value, perPage.value) })
    if (request !== latest) return
    rows.value = res.data.data
    total.value = res.data.meta.total
    hiddenInternal.value = res.data.meta.hiddenInternal ?? 0
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)

let timer: ReturnType<typeof setTimeout> | undefined
watch(() => filters.value.search, () => { clearTimeout(timer); timer = setTimeout(() => { page.value = 1; load() }, 400) })
watch(() => [filters.value.kind, filters.value.status, filters.value.internal], () => { page.value = 1; load() })
watch([page, perPage], load)

const clear = () => { filters.value = { search: '', kind: null, status: null, internal: false } }
const open = (id: number) => router.push(`/dashboard/users/${id}`)

const headers = [
  { title: 'Nombre', key: 'name', sortable: false },
  { title: 'Correo', key: 'email', sortable: false },
  { title: 'Rol', key: 'staffRoles', sortable: false },
  { title: 'Eventos', key: 'eventsCount', sortable: false, align: 'end' as const },
  { title: 'Estado', key: 'suspended', sortable: false },
  { title: 'Último acceso', key: 'lastAccessAt', sortable: false },
  { title: 'Alta', key: 'createdAt', sortable: false },
]
const lastPage = computed(() => Math.max(1, Math.ceil(total.value / perPage.value)))

const createOpen = ref(false)
const onSaved = () => { createOpen.value = false; load() }
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="title">Usuarios</h2>
        <p class="text-medium-emphasis">Cuentas de organizadoras y del equipo. Abre una para ver sus eventos, compras y sesiones, o para actuar sobre ella.</p>
      </div>
      <v-btn v-if="me.can('admin.users.manage')" color="primary" prepend-icon="mdi-account-plus-outline" @click="createOpen = true">Nuevo usuario</v-btn>
    </header>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-text-field v-model="filters.search" label="Buscar por nombre, correo o teléfono" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.kind" :items="[{ title: 'Equipo', value: 'staff' }, { title: 'Clientas', value: 'customer' }]" label="Tipo" clearable hide-details />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.status" :items="[{ title: 'Activas', value: 'active' }, { title: 'Suspendidas', value: 'suspended' }]" label="Estado" clearable hide-details />
        </v-col>
        <v-col cols="12" md="4" class="d-flex align-center justify-space-between flex-wrap">
          <v-checkbox v-model="filters.internal" label="Incluir cuentas internas" hide-details density="comfortable" />
          <v-btn v-if="hasFilters" variant="text" prepend-icon="mdi-filter-off-outline" @click="clear">Quitar filtros</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-alert v-if="hiddenInternal > 0 && !filters.internal && !failed" type="info" variant="tonal" density="compact" class="mb-4">
      {{ hiddenInternal }} {{ hiddenInternal === 1 ? 'cuenta interna está oculta' : 'cuentas internas (demo y personal) están ocultas' }}.
      <template #append><v-btn variant="text" @click="filters = { ...filters, internal: true }">Mostrarlos</v-btn></template>
    </v-alert>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar los usuarios.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <p class="sr-only" role="status" aria-live="polite">{{ loading ? 'Cargando…' : `${total} usuarios` }}</p>

    <!-- Phone: cards -->
    <div v-if="smAndDown" class="cards" :class="{ 'is-loading': loading && rows.length }">
      <v-skeleton-loader v-if="loading && !rows.length" type="list-item-two-line@4" />
      <p v-else-if="!rows.length && !failed" class="empty">No hay usuarios con estos filtros.</p>
      <v-card v-for="u in rows" :key="u.id" class="ucard" :ripple="true" tabindex="0" role="link" :aria-label="`Abrir a ${u.name}`" @click="open(u.id)" @keydown.enter="open(u.id)">
        <div class="ucard__top">
          <strong class="ucard__name">{{ u.name }}</strong>
          <v-chip v-if="u.suspended" color="error" variant="tonal" size="small">Suspendida</v-chip>
          <v-chip v-else-if="u.anonymized" variant="tonal" size="small">Borrada</v-chip>
        </div>
        <p class="ucard__mail">{{ u.email }}</p>
        <p class="ucard__meta">
          <v-chip v-for="r in u.staffRoles" :key="r" color="primary" variant="tonal" size="x-small" class="mr-1">{{ ROLE_LABELS[r] }}</v-chip>
          {{ u.eventsCount }} {{ u.eventsCount === 1 ? 'evento' : 'eventos' }} · Último acceso {{ dateLabel(u.lastAccessAt) }}
        </p>
      </v-card>
      <v-pagination v-if="lastPage > 1" v-model="page" :length="lastPage" :total-visible="3" density="comfortable" class="mt-2" />
    </div>

    <!-- Desktop: table -->
    <v-card v-else class="table-card" :class="{ 'is-loading': loading && rows.length }">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="perPage"
        :headers="headers"
        :items="rows"
        :items-length="total"
        :loading="loading && !rows.length"
        item-value="id"
        :items-per-page-options="[10, 25, 50, 100]"
        items-per-page-text="Por página"
        no-data-text="No hay usuarios con estos filtros."
        loading-text="Cargando…"
        hover
        @click:row="(_: Event, { item }: { item: UserRow }) => open(item.id)"
      >
        <template #item.name="{ item }">
          <router-link :to="`/dashboard/users/${item.id}`" class="name-link" @click.stop><strong>{{ item.name }}</strong></router-link>
        </template>
        <template #item.staffRoles="{ item }">
          <v-chip v-for="r in item.staffRoles" :key="r" color="primary" variant="tonal" size="small" class="mr-1">{{ ROLE_LABELS[r] }}</v-chip>
          <span v-if="!item.staffRoles.length" class="text-medium-emphasis">Clienta</span>
        </template>
        <template #item.suspended="{ item }">
          <v-chip v-if="item.suspended" color="error" variant="tonal" size="small" prepend-icon="mdi-cancel">Suspendida</v-chip>
          <v-chip v-else-if="item.anonymized" variant="tonal" size="small">Borrada</v-chip>
          <v-chip v-else color="success" variant="tonal" size="small">Activa</v-chip>
        </template>
        <template #item.lastAccessAt="{ item }"><span class="nowrap">{{ dateLabel(item.lastAccessAt) }}</span></template>
        <template #item.createdAt="{ item }"><span class="nowrap">{{ dateLabel(item.createdAt) }}</span></template>
      </v-data-table-server>
    </v-card>

    <UserFormDialog v-model="createOpen" @saved="onSaved" />
  </section>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.title { font-size: 2rem; margin-bottom: 4px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.table-card :deep(tbody tr) { cursor: pointer; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.name-link { color: inherit; text-decoration: none; }
.name-link:hover, .name-link:focus-visible { text-decoration: underline; }
.cards { display: grid; gap: 12px; }
.ucard { padding: 14px 16px; min-height: 44px; cursor: pointer; }
.ucard:focus-visible { outline: 2px solid var(--rose-600); outline-offset: 2px; }
.ucard__top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.ucard__name { overflow-wrap: anywhere; }
.ucard__mail { margin: 2px 0 6px; color: var(--ink-500); font-size: 0.875rem; overflow-wrap: anywhere; }
.ucard__meta { margin: 0; font-size: 0.8125rem; color: var(--ink-500); }
.empty { text-align: center; color: var(--ink-500); padding: 32px 0; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
