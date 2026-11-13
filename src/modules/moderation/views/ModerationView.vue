<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ReasonDialog from '@/components/ReasonDialog.vue'
import ModerationCard from '../components/ModerationCard.vue'
import PhotoViewer from '../components/PhotoViewer.vue'
import { bulk, deleteItem, fetchQueue, hideItem, restoreItem } from '../services/moderationApi'
import { ACTION_TEXT, emptyFilters, explainError, itemKey, resultError, summarizeBulk } from '../logic'
import type { BulkAction, BulkResult, ItemType, ModerationItem } from '../types'

const me = useCurrentUserStore()
const canModerate = computed(() => me.can('admin.content.moderate'))

const items = ref<ModerationItem[]>([])
const total = ref(0)
const lastPage = ref(1)
const page = ref(1)
const perPage = ref(24)
const loading = ref(true)
const failed = ref(false)
const filters = ref(emptyFilters())
const hasFilters = computed(() => Object.values(filters.value).some(v => v !== null && v !== ''))

const TYPE_OPTIONS = [{ value: 'comment', title: 'Comentarios' }, { value: 'image', title: 'Fotos' }]
const STATUS_OPTIONS = [{ value: 'visible', title: 'Visibles' }, { value: 'hidden', title: 'Ocultos' }]

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchQueue(filters.value, page.value, perPage.value)
    if (request !== latest) return
    items.value = res.data
    total.value = res.meta.total
    lastPage.value = res.meta.lastPage
    // The last page can disappear after deleting: go back one.
    if (page.value > res.meta.lastPage && res.meta.lastPage >= 1) page.value = res.meta.lastPage
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

// ── selection (page-scoped: it is cleared when the filters or the page change) ──
const selected = ref<string[]>([])
const selectedSet = computed(() => new Set(selected.value))
const pageKeys = computed(() => items.value.map(itemKey))
const allSelected = computed(() => pageKeys.value.length > 0 && pageKeys.value.every(k => selectedSet.value.has(k)))
const someSelected = computed(() => selected.value.length > 0 && !allSelected.value)
const toggleOne = (key: string, on: boolean) => {
  selected.value = on ? [...new Set([...selected.value, key])] : selected.value.filter(k => k !== key)
}
const togglePage = (on: boolean) => { selected.value = on ? [...pageKeys.value] : [] }
const clearSelection = () => { selected.value = [] }
const parseKey = (key: string) => { const [type, id] = key.split(':'); return { type: type as ItemType, id: Number(id) } }

let timer: ReturnType<typeof setTimeout> | undefined
let lastSearch = ''
watch(filters, f => {
  const searchChanged = f.search !== lastSearch
  lastSearch = f.search
  clearTimeout(timer)
  timer = setTimeout(() => { clearSelection(); lastResult.value = null; if (page.value !== 1) page.value = 1; else load() }, searchChanged ? 400 : 0)
}, { deep: true })
watch(page, () => { clearSelection(); load() })
watch(perPage, () => { clearSelection(); if (page.value !== 1) page.value = 1; else load() })
const clearFilters = () => { filters.value = emptyFilters() }

// ── feedback ──
const notice = ref('')
const rowBusy = ref<string[]>([])

// ── dialogs ──
type Pending = { mode: 'hide' | 'delete'; keys: string[]; bulk: boolean }
const pending = ref<Pending | null>(null)
const dialogOpen = computed({ get: () => pending.value !== null, set: v => { if (!v && !dialogLoading.value) pending.value = null } })
const dialogLoading = ref(false)
const dialogError = ref('')

const labelOf = (keys: string[]) => {
  if (keys.length > 1) return `${keys.length} elementos`
  const it = items.value.find(i => itemKey(i) === keys[0])
  return it?.type === 'image' ? 'esta foto' : 'este comentario'
}
const dialogTitle = computed(() => {
  const p = pending.value
  if (!p) return ''
  return `${p.mode === 'hide' ? 'Ocultar' : 'Borrar'} ${p.bulk ? labelOf(p.keys) : labelOf(p.keys)}`
})
const dialogMessage = computed(() => {
  const p = pending.value
  if (!p) return ''
  return p.mode === 'hide'
    ? 'Dejará de verse en la invitación y en las secciones públicas. Se puede restaurar después.'
    : 'Se borra para siempre, junto con el archivo de la foto si lo hay. No se puede deshacer.'
})
const askSingle = (mode: 'hide' | 'delete', item: ModerationItem) => { dialogError.value = ''; pending.value = { mode, keys: [itemKey(item)], bulk: false } }
const askBulk = (mode: 'hide' | 'delete') => { dialogError.value = ''; pending.value = { mode, keys: [...selected.value], bulk: true } }

const withBusy = async (keys: string[], fn: () => Promise<void>) => {
  rowBusy.value = [...rowBusy.value, ...keys]
  try { await fn() } finally { rowBusy.value = rowBusy.value.filter(k => !keys.includes(k)) }
}

const restoreSingle = async (item: ModerationItem) => {
  const key = itemKey(item)
  notice.value = ''
  await withBusy([key], async () => {
    try {
      await restoreItem(item.type, item.id)
      notice.value = item.type === 'image' ? 'Foto restaurada.' : 'Comentario restaurado.'
      await load()
    } catch (e) { notice.value = explainError(e) }
  })
}

// ── bulk ──
interface LastResult { action: BulkAction; reason?: string; summary: string; failures: { key: string; text: string; message: string }[]; retrying: boolean }
const lastResult = ref<LastResult | null>(null)

const describe = (key: string) => {
  const it = items.value.find(i => itemKey(i) === key)
  if (!it) return key.startsWith('image') ? 'Foto' : 'Comentario'
  return it.type === 'image' ? `Foto de ${it.event.name}` : `«${(it.content.text ?? '').slice(0, 40)}${(it.content.text ?? '').length > 40 ? '…' : ''}»`
}

const runBulk = async (action: BulkAction, keys: string[], reason?: string) => {
  const res = await bulk(action, keys.map(parseKey), reason)
  const failures = res.results.filter((r: BulkResult) => !r.ok).map((r: BulkResult) => {
    const key = itemKey(r)
    return { key, text: describe(key), message: resultError(r) }
  })
  lastResult.value = { action, reason, summary: summarizeBulk(action, res.succeeded, res.failed), failures, retrying: false }
  // Keep selected only what failed, so "Reintentar" has something to retry.
  selected.value = failures.map(f => f.key)
  await load()
}

const confirmReason = async (reason: string) => {
  const p = pending.value
  if (!p) return
  dialogLoading.value = true
  dialogError.value = ''
  notice.value = ''
  try {
    if (p.bulk) {
      await runBulk(p.mode, p.keys, reason)
    } else {
      const { type, id } = parseKey(p.keys[0])
      if (p.mode === 'hide') await hideItem(type, id, reason)
      else await deleteItem(type, id, reason)
      notice.value = p.mode === 'hide' ? 'Ocultado.' : 'Borrado.'
      selected.value = selected.value.filter(k => k !== p.keys[0])
      await load()
    }
    pending.value = null
  } catch (e) {
    dialogError.value = explainError(e)
  } finally {
    dialogLoading.value = false
  }
}

const restoreBulk = async () => {
  notice.value = ''
  bulkBusy.value = true
  try { await runBulk('restore', [...selected.value]) } catch (e) { notice.value = explainError(e) } finally { bulkBusy.value = false }
}
const bulkBusy = ref(false)

const retryFailed = async () => {
  const r = lastResult.value
  if (!r || !r.failures.length) return
  r.retrying = true
  try { await runBulk(r.action, r.failures.map(f => f.key), r.reason) } catch (e) { notice.value = explainError(e); r.retrying = false }
}

// ── viewer ──
const photos = computed(() => items.value.filter(i => i.type === 'image'))
const viewerOpen = ref(false)
const viewerIndex = ref(0)
const openViewer = (item: ModerationItem) => { viewerIndex.value = Math.max(0, photos.value.findIndex(p => itemKey(p) === itemKey(item))); viewerOpen.value = true }

// ── keyboard: "/" searches, Escape clears the selection ──
const searchField = ref<{ focus: () => void } | null>(null)
const onKey = (e: KeyboardEvent) => {
  if (dialogOpen.value || viewerOpen.value || e.ctrlKey || e.metaKey || e.altKey) return
  const t = e.target as HTMLElement | null
  const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
  if (e.key === '/' && !typing) { e.preventDefault(); searchField.value?.focus() }
  else if (e.key === 'Escape' && !typing && selected.value.length) clearSelection()
}
onMounted(() => { window.addEventListener('keydown', onKey); load() })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearTimeout(timer) })
</script>

<template>
  <section class="queue">
    <header class="mb-6">
      <h2 class="title">Moderación</h2>
      <p class="text-medium-emphasis">Comentarios y fotos de todos los eventos. Ocultar los quita de la invitación pública y se puede deshacer; borrar no. Todo queda en la auditoría.</p>
    </header>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="4">
          <v-text-field ref="searchField" v-model="filters.search" label="Buscar" placeholder="Texto, autora o evento (atajo: /)" prepend-inner-icon="mdi-magnify" clearable hide-details />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.type" :items="TYPE_OPTIONS" label="Tipo" clearable hide-details />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.status" :items="STATUS_OPTIONS" label="Estado" clearable hide-details />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field v-model="filters.eventId" label="ID del evento" inputmode="numeric" clearable hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="filters.from" label="Desde" type="date" hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="filters.to" label="Hasta" type="date" hide-details />
        </v-col>
        <v-col cols="12" md="6" class="d-flex align-center justify-end">
          <v-btn v-if="hasFilters" variant="text" prepend-icon="mdi-filter-off-outline" @click="clearFilters">Quitar filtros</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <div aria-live="polite" class="live">
      <v-alert v-if="notice" type="info" variant="tonal" density="compact" closable class="mb-4" :text="notice" @click:close="notice = ''" />
      <v-alert v-if="lastResult" :type="lastResult.failures.length ? 'warning' : 'success'" variant="tonal" closable class="mb-4" @click:close="lastResult = null">
        <p class="font-weight-bold mb-1">{{ lastResult.summary }}</p>
        <template v-if="lastResult.failures.length">
          <ul class="fail-list">
            <li v-for="f in lastResult.failures" :key="f.key"><strong>{{ f.text }}</strong>: {{ f.message }}</li>
          </ul>
          <v-btn class="mt-2 retry" variant="flat" color="primary" :loading="lastResult.retrying" prepend-icon="mdi-refresh" @click="retryFailed">
            Reintentar los {{ lastResult.failures.length }} fallidos
          </v-btn>
        </template>
      </v-alert>
    </div>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar la cola.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <div v-if="canModerate && items.length" class="selectbar">
      <v-checkbox-btn :model-value="allSelected" :indeterminate="someSelected" label="Seleccionar esta página" class="selectall" @update:model-value="togglePage(Boolean($event))" />
      <span class="text-medium-emphasis text-body-2">{{ total }} {{ total === 1 ? 'elemento' : 'elementos' }}</span>
    </div>

    <div v-if="loading && !items.length" class="grid" aria-busy="true" aria-label="Cargando">
      <v-skeleton-loader v-for="n in 6" :key="n" type="image, article" class="skel" />
    </div>

    <v-card v-else-if="!items.length && !failed" class="pa-8 text-center empty">
      <v-icon icon="mdi-shield-check-outline" size="48" color="primary" class="mb-2" />
      <p class="text-h6 font-heading">{{ hasFilters ? 'Nada con estos filtros' : 'No hay nada que moderar' }}</p>
      <p class="text-medium-emphasis">{{ hasFilters ? 'Prueba con otro tipo, estado o rango de fechas.' : 'Cuando haya comentarios o fotos, aparecen aquí.' }}</p>
      <v-btn v-if="hasFilters" class="mt-3" variant="tonal" @click="clearFilters">Quitar filtros</v-btn>
    </v-card>

    <div v-else class="grid" :class="{ 'is-loading': loading }">
      <ModerationCard
        v-for="it in items"
        :key="itemKey(it)"
        :item="it"
        :selected="selectedSet.has(itemKey(it))"
        :busy="rowBusy.includes(itemKey(it))"
        :can-moderate="canModerate"
        @select="toggleOne(itemKey(it), $event)"
        @open="openViewer(it)"
        @hide="askSingle('hide', it)"
        @restore="restoreSingle(it)"
        @remove="askSingle('delete', it)"
      />
    </div>

    <div v-if="lastPage > 1 || perPage !== 24" class="pager">
      <v-select v-model="perPage" :items="[12, 24, 48, 100]" label="Por página" density="compact" hide-details class="per-page" />
      <v-pagination v-model="page" :length="lastPage" :total-visible="5" density="comfortable" />
    </div>

    <div v-if="canModerate && selected.length" class="bulkbar" role="region" aria-label="Acciones en lote">
      <span class="count" aria-live="polite">{{ selected.length }} {{ selected.length === 1 ? 'seleccionado' : 'seleccionados' }}</span>
      <div class="bulk-actions">
        <v-btn variant="flat" color="primary" :prepend-icon="ACTION_TEXT.hide.icon" :disabled="bulkBusy" @click="askBulk('hide')">Ocultar</v-btn>
        <v-btn variant="flat" class="on-dark" :prepend-icon="ACTION_TEXT.restore.icon" :loading="bulkBusy" @click="restoreBulk">Restaurar</v-btn>
        <v-btn variant="flat" class="on-dark on-dark--danger" :prepend-icon="ACTION_TEXT.delete.icon" :disabled="bulkBusy" @click="askBulk('delete')">Borrar</v-btn>
        <v-btn variant="text" :disabled="bulkBusy" @click="clearSelection">Quitar selección</v-btn>
      </div>
    </div>

    <ReasonDialog
      v-model="dialogOpen"
      :title="dialogTitle"
      :message="dialogMessage"
      :confirm-label="pending?.mode === 'delete' ? 'Borrar para siempre' : 'Ocultar'"
      :danger="pending?.mode === 'delete'"
      :loading="dialogLoading"
      :error="dialogError"
      @confirm="confirmReason"
    />

    <PhotoViewer v-model="viewerOpen" v-model:index="viewerIndex" :photos="photos" />
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.queue { padding-bottom: 88px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; transition: opacity 0.15s ease-out; }
.grid.is-loading { opacity: 0.55; }
.skel { border: 1px solid var(--line); }
.selectbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.selectall { flex: none; }
.selectall :deep(.v-selection-control) { min-height: 44px; }
.pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; margin-top: 24px; }
.per-page { max-width: 120px; }
.fail-list { margin: 0; padding-left: 20px; overflow-wrap: anywhere; }
.retry { min-height: 44px; }
.bulkbar {
  position: sticky; bottom: 12px; z-index: 5; margin-top: 16px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom)); background: var(--wine-900); color: #fff; border-radius: 12px;
  box-shadow: 0 12px 32px -8px rgba(43, 36, 32, 0.45);
}
.bulkbar .count { font-weight: 700; }
.bulk-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.bulk-actions .v-btn { min-height: 44px; }
.bulk-actions .v-btn--variant-text { color: #fff; }
.bulk-actions .on-dark { background: var(--cream-100); color: var(--ink-900); }
.bulk-actions .on-dark--danger { color: #a3202f; }
@media (max-width: 599px) { .grid { grid-template-columns: 1fr; } }
</style>
