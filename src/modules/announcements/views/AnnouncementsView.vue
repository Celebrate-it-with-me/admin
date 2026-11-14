<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import ReasonDialog from '@/components/ReasonDialog.vue'
import AnnouncementFormDialog from '../components/AnnouncementFormDialog.vue'
import StatusChip from '../components/StatusChip.vue'
import { deleteAnnouncement, listAnnouncements } from '../services/announcementsApi'
import { STATUS_ORDER, STATUS_VIEWS, audienceLabel, levelView, parseError, periodLabel } from '../logic'
import type { Announcement, AnnouncementStatus, PageMeta } from '../types'

const PER_PAGE = 10
const { smAndDown } = useDisplay()

const items = ref<Announcement[]>([])
const meta = ref<PageMeta>({ page: 1, perPage: PER_PAGE, total: 0 })
const status = ref<AnnouncementStatus | 'all'>('all')
const page = ref(1)
const loading = ref(true)
const failed = ref(false)
const notice = ref<{ type: 'success' | 'error'; text: string } | null>(null)

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const result = await listAnnouncements({ status: status.value === 'all' ? null : status.value, page: page.value, perPage: PER_PAGE })
    if (request !== latest) return
    items.value = result.items
    meta.value = result.meta
    // The page vanished (the last item of it was deleted): go back one.
    if (!result.items.length && page.value > 1) { page.value = Math.max(1, Math.ceil(result.meta.total / PER_PAGE)); }
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)
watch(page, load)
watch(status, () => { if (page.value === 1) void load(); else page.value = 1 })

const lastPage = computed(() => Math.max(1, Math.ceil(meta.value.total / (meta.value.perPage || PER_PAGE))))
const filtered = computed(() => status.value !== 'all')
const FILTERS: { value: AnnouncementStatus | 'all'; title: string }[] = [{ value: 'all', title: 'Todos' }, ...STATUS_ORDER.map(value => ({ value, title: STATUS_VIEWS[value].label }))]

// ── create / edit ──
const formOpen = ref(false)
const editing = ref<Announcement | null>(null)
const openCreate = () => { notice.value = null; editing.value = null; formOpen.value = true }
const openEdit = (a: Announcement) => { notice.value = null; editing.value = a; formOpen.value = true }
const onSaved = async (a: Announcement, kind: 'created' | 'updated') => {
  notice.value = { type: 'success', text: kind === 'created' ? `Creamos el anuncio «${a.titleEs}».` : `Guardamos los cambios de «${a.titleEs}».` }
  if (kind === 'created') { page.value = 1 }
  await load()
}
const onGone = async () => {
  notice.value = { type: 'error', text: 'Ese anuncio ya no existe. Quizá lo borró otra persona; mostramos la lista al día.' }
  await load()
}

// ── delete ──
const target = ref<Announcement | null>(null)
const deleting = ref(false)
const deleteError = ref('')
const askDelete = (a: Announcement) => { notice.value = null; deleteError.value = ''; target.value = a }
const confirmDelete = async (reason: string) => {
  const a = target.value
  if (!a) return
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteAnnouncement(a.id, reason)
    notice.value = { type: 'success', text: `Borramos el anuncio «${a.titleEs}».` }
    target.value = null
    await load()
  } catch (e) {
    const err = parseError(e)
    if (err.code === 'announcement_not_found') { target.value = null; await onGone() } else deleteError.value = err.message
  } finally { deleting.value = false }
}

const levelOf = (a: Announcement) => levelView(a.level)
const audienceOf = (a: Announcement) => audienceLabel(a.audience, a.upcomingDays)
const headers = ['Anuncio', 'Estado', 'Cuándo', 'Audiencia', 'Lo cerraron']
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="title">Anuncios</h2>
        <p class="text-medium-emphasis">Mensajes que las organizadoras ven en la parte de arriba de la app. Cada cambio pide un motivo y queda en la auditoría.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-plus" class="touch" @click="openCreate">Nuevo anuncio</v-btn>
    </header>

    <div aria-live="polite">
      <v-alert v-if="notice" :type="notice.type" variant="tonal" closable class="mb-4" :text="notice.text" @click:close="notice = null" />
    </div>
    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar los anuncios.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <v-card class="pa-3 mb-4">
      <v-chip-group v-model="status" mandatory selected-class="text-primary" aria-label="Filtrar por estado" class="filters">
        <v-chip v-for="f in FILTERS" :key="f.value" :value="f.value" filter variant="outlined" class="touch-chip" :data-filter="f.value">{{ f.title }}</v-chip>
      </v-chip-group>
    </v-card>

    <p class="sr-only" role="status" aria-live="polite">{{ loading ? 'Cargando…' : `${meta.total} anuncios` }}</p>

    <!-- Loading, first time -->
    <v-card v-if="loading && !items.length && !failed" class="pa-2" aria-busy="true">
      <v-skeleton-loader type="list-item-three-line@3" />
    </v-card>

    <!-- Empty -->
    <v-card v-else-if="!items.length && !failed" class="pa-8 empty">
      <v-icon size="40" icon="mdi-bullhorn-outline" color="primary" class="mb-3" />
      <template v-if="filtered">
        <p class="empty__title">No hay anuncios con ese estado.</p>
        <v-btn variant="tonal" class="touch mt-3" @click="status = 'all'">Ver todos</v-btn>
      </template>
      <template v-else>
        <p class="empty__title">Todavía no hay anuncios.</p>
        <p class="text-medium-emphasis">Crea el primero para hablarle a las organizadoras dentro de la app.</p>
        <v-btn color="primary" class="touch mt-3" prepend-icon="mdi-plus" @click="openCreate">Nuevo anuncio</v-btn>
      </template>
    </v-card>

    <!-- Phone: cards -->
    <div v-else-if="smAndDown" class="cards" :class="{ 'is-loading': loading }">
      <v-card v-for="a in items" :key="a.id" class="acard" :data-announcement="a.id">
        <div class="acard__top">
          <div class="acard__who">
            <v-chip :color="levelOf(a).color" variant="tonal" size="x-small" :prepend-icon="levelOf(a).icon">{{ levelOf(a).title }}</v-chip>
            <strong class="acard__title">{{ a.titleEs }}</strong>
          </div>
          <StatusChip :status="a.status" />
        </div>
        <p class="acard__meta"><v-icon size="16" icon="mdi-calendar-range" />{{ periodLabel(a) }}</p>
        <p class="acard__meta"><v-icon size="16" icon="mdi-account-group-outline" />{{ audienceOf(a) }}</p>
        <p class="acard__meta"><v-icon size="16" icon="mdi-close-circle-outline" />{{ a.dismissible ? `Lo cerraron ${a.dismissedCount}` : 'No se puede cerrar' }}</p>
        <div class="acard__actions">
          <v-btn variant="tonal" prepend-icon="mdi-pencil-outline" class="touch" @click="openEdit(a)">Editar</v-btn>
          <v-btn variant="text" color="error" prepend-icon="mdi-delete-outline" class="touch" @click="askDelete(a)">Borrar</v-btn>
        </div>
      </v-card>
    </div>

    <!-- Desktop: table -->
    <v-card v-else class="table-card" :class="{ 'is-loading': loading }">
      <v-table>
        <thead>
          <tr>
            <th v-for="h in headers" :key="h" scope="col">{{ h }}</th>
            <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in items" :key="a.id" :data-announcement="a.id">
            <td class="wide">
              <v-chip :color="levelOf(a).color" variant="tonal" size="x-small" :prepend-icon="levelOf(a).icon" class="mr-2">{{ levelOf(a).title }}</v-chip>
              <strong>{{ a.titleEs }}</strong>
              <div class="sub">{{ a.titleEn }}</div>
            </td>
            <td><StatusChip :status="a.status" /></td>
            <td class="when">{{ periodLabel(a) }}</td>
            <td>{{ audienceOf(a) }}</td>
            <td>{{ a.dismissible ? a.dismissedCount : 'No se puede cerrar' }}</td>
            <td class="text-right nowrap">
              <v-btn icon="mdi-pencil-outline" variant="text" :aria-label="`Editar «${a.titleEs}»`" @click="openEdit(a)" />
              <v-btn icon="mdi-delete-outline" variant="text" color="error" :aria-label="`Borrar «${a.titleEs}»`" @click="askDelete(a)" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-pagination v-if="lastPage > 1" v-model="page" :length="lastPage" :total-visible="smAndDown ? 3 : 7" density="comfortable" class="mt-4" />

    <AnnouncementFormDialog v-model="formOpen" :announcement="editing" @saved="onSaved" @gone="onGone" />

    <ReasonDialog
      :model-value="target !== null"
      title="Borrar el anuncio"
      :message="target ? `«${target.titleEs}» dejará de verse y no se puede recuperar. Si solo quieres pausarlo, apágalo desde Editar.` : ''"
      confirm-label="Borrar"
      danger
      :loading="deleting"
      :error="deleteError"
      @update:model-value="target = null"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.title { font-size: 2rem; margin-bottom: 4px; }
.touch { min-height: 44px; }
.touch-chip { min-height: 36px; }
.filters :deep(.v-slide-group__content) { flex-wrap: wrap; gap: 4px 0; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.wide { min-width: 260px; max-width: 420px; }
.when { font-size: 0.875rem; }
.sub { font-size: 0.8125rem; color: var(--ink-500); overflow-wrap: anywhere; }
.empty { text-align: center; }
.empty__title { font-family: var(--font-heading); font-size: 1.25rem; }
.cards { display: grid; gap: 12px; }
.acard { padding: 14px 16px; }
.acard__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.acard__who { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.acard__title { overflow-wrap: anywhere; }
.acard__meta { margin: 8px 0 0; font-size: 0.8125rem; color: var(--ink-500); display: flex; align-items: flex-start; gap: 6px; overflow-wrap: anywhere; }
.acard__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
