<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ReasonDialog from '@/components/ReasonDialog.vue'
import Pager from '../actions/Pager.vue'
import { deleteItem, fetchContent, hideItem, restoreItem, type CommentItem, type GuestItem, type ImageItem, type Meta, type PadrinoItem } from '../actions/api'
import { errorMessage, PADRINO_STATUS, rsvpTone } from '../actions/logic'
import { dateLabel } from '../labels'
import type { EventDetail } from '../types'

const props = defineProps<{ detail: EventDetail }>()
const emit = defineEmits<{ reload: [] }>()

const store = useCurrentUserStore()
const canModerate = computed(() => store.can('admin.content.moderate'))
const id = computed(() => props.detail.event.id)

type Section = 'comments' | 'images' | 'padrinos' | 'guests'
const SECTIONS: { key: Section; title: string }[] = [
  { key: 'comments', title: 'Comentarios' }, { key: 'images', title: 'Fotos' }, { key: 'padrinos', title: 'Padrinos' }, { key: 'guests', title: 'Invitados' },
]
type Item = CommentItem | ImageItem | PadrinoItem | GuestItem

const section = ref<Section>('comments')
const rows = ref<Item[]>([])
const meta = ref<Meta | null>(null)
const page = ref(1)
const loading = ref(true)
const failed = ref(false)

let latest = 0
async function load() {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchContent<Item>(id.value, section.value, page.value)
    if (request !== latest) return
    rows.value = res.data
    meta.value = res.meta
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
watch(section, () => { page.value = 1; rows.value = []; meta.value = null; load() }, { immediate: true })
watch(id, () => { page.value = 1; load() })
const goto = (p: number) => { page.value = p; load() }

// Hide / delete
const target = ref<{ action: 'hide' | 'delete'; item: CommentItem | ImageItem } | null>(null)
const open = computed({ get: () => target.value !== null, set: v => { if (!v) { target.value = null; error.value = '' } } })
const busy = ref(false)
const error = ref('')
const notice = ref('')

async function confirm(reason: string) {
  const t = target.value
  if (!t) return
  busy.value = true
  error.value = ''
  try {
    if (t.action === 'hide') await hideItem(t.item.type, t.item.id, reason)
    else await deleteItem(t.item.type, t.item.id, reason)
    notice.value = t.action === 'hide' ? 'Se ocultó el elemento.' : 'Se borró el elemento.'
    target.value = null
    await load()
    emit('reload')
  } catch (e) {
    error.value = errorMessage(e)
  } finally { busy.value = false }
}
async function show(item: CommentItem | ImageItem) {
  try {
    await restoreItem(item.type, item.id)
    notice.value = 'El elemento vuelve a mostrarse.'
    await load()
    emit('reload')
  } catch (e) { notice.value = ''; error.value = errorMessage(e); failed.value = false }
}

const comments = computed(() => rows.value as CommentItem[])
const images = computed(() => rows.value as ImageItem[])
const padrinos = computed(() => rows.value as PadrinoItem[])
const guests = computed(() => rows.value as GuestItem[])
const emptyText: Record<Section, string> = {
  comments: 'Este evento no tiene comentarios.', images: 'Este evento no tiene fotos.', padrinos: 'Este evento no tiene padrinos.', guests: 'Este evento no tiene invitados.',
}
</script>

<template>
  <div>
    <v-tabs v-model="section" color="primary" density="comfortable" show-arrows class="mb-4 sub" aria-label="Tipo de contenido">
      <v-tab v-for="s in SECTIONS" :key="s.key" :value="s.key" class="tab">{{ s.title }}</v-tab>
    </v-tabs>

    <v-alert v-if="notice" type="success" variant="tonal" closable class="mb-3" :text="notice" aria-live="polite" @click:close="notice = ''" />
    <v-alert v-if="error && !open" type="error" variant="tonal" closable class="mb-3" :text="error" @click:close="error = ''" />
    <p v-if="section === 'padrinos' || section === 'guests'" class="text-caption text-medium-emphasis mb-2">Solo lectura. Los teléfonos y correos se muestran enmascarados.</p>

    <v-card class="pa-4" :aria-busy="loading">
      <v-skeleton-loader v-if="loading && !rows.length" type="list-item-two-line, list-item-two-line, list-item-two-line" />

      <v-alert v-else-if="failed" type="error" variant="tonal" text="No pudimos cargar el contenido.">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <p v-else-if="!rows.length" class="text-medium-emphasis pa-4 text-center">{{ emptyText[section] }}</p>

      <div v-else :class="{ dim: loading }">
        <ul v-if="section === 'comments'" class="list">
          <li v-for="c in comments" :key="c.id" class="row">
            <div class="main">
              <p class="text">{{ c.text }}</p>
              <p class="text-caption text-medium-emphasis">{{ c.author?.name ?? 'Anónimo' }} · {{ dateLabel(c.createdAt, true) }}</p>
            </div>
            <v-chip v-if="c.status === 'hidden'" size="small" color="warning" variant="tonal">Oculto</v-chip>
            <div v-if="canModerate" class="acts">
              <v-btn v-if="c.status === 'hidden'" size="small" variant="tonal" class="btn" @click="show(c)">Mostrar</v-btn>
              <v-btn v-else size="small" variant="tonal" class="btn" @click="target = { action: 'hide', item: c }">Ocultar</v-btn>
              <v-btn size="small" variant="tonal" color="error" class="btn" @click="target = { action: 'delete', item: c }">Borrar</v-btn>
            </div>
          </li>
        </ul>

        <ul v-else-if="section === 'images'" class="grid">
          <li v-for="i in images" :key="i.id" class="photo">
            <div class="thumb">
              <img v-if="i.thumbnailUrl" :src="i.thumbnailUrl" :alt="i.title ?? 'Foto del evento'" loading="lazy">
              <v-icon v-else icon="mdi-image-off-outline" aria-hidden="true" />
            </div>
            <p class="text-body-2 title">{{ i.title ?? 'Sin título' }}</p>
            <p class="text-caption text-medium-emphasis">{{ dateLabel(i.createdAt) }}</p>
            <v-chip v-if="i.status === 'hidden'" size="x-small" color="warning" variant="tonal">Oculta</v-chip>
            <div v-if="canModerate" class="acts">
              <v-btn v-if="i.status === 'hidden'" size="small" variant="tonal" class="btn" @click="show(i)">Mostrar</v-btn>
              <v-btn v-else size="small" variant="tonal" class="btn" @click="target = { action: 'hide', item: i }">Ocultar</v-btn>
              <v-btn size="small" variant="tonal" color="error" class="btn" @click="target = { action: 'delete', item: i }">Borrar</v-btn>
            </div>
          </li>
        </ul>

        <v-table v-else-if="section === 'padrinos'" density="comfortable">
          <thead><tr><th scope="col">Nombre</th><th scope="col">Parentesco</th><th scope="col">Estado</th><th scope="col">Teléfono</th><th scope="col">Correo</th></tr></thead>
          <tbody>
            <tr v-for="p in padrinos" :key="p.id">
              <td>{{ p.name }}</td><td>{{ p.relationship ?? '—' }}</td><td>{{ PADRINO_STATUS[p.status] ?? p.status }}</td><td>{{ p.phone ?? '—' }}</td><td>{{ p.email ?? '—' }}</td>
            </tr>
          </tbody>
        </v-table>

        <v-table v-else density="comfortable">
          <thead><tr><th scope="col">Nombre</th><th scope="col">Respuesta</th><th scope="col">Teléfono</th><th scope="col">Correo</th></tr></thead>
          <tbody>
            <tr v-for="g in guests" :key="g.id">
              <td>{{ g.name }}<span v-if="g.isCompanion" class="text-caption text-medium-emphasis"> · acompañante</span></td>
              <td><v-chip size="small" variant="tonal" :color="rsvpTone(g.rsvpStatus).color">{{ rsvpTone(g.rsvpStatus).label }}</v-chip></td>
              <td>{{ g.phone ?? '—' }}</td><td>{{ g.email ?? '—' }}</td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-card>

    <Pager :meta="meta" :disabled="loading" @page="goto" />

    <ReasonDialog
      v-model="open" :loading="busy" :error="error" danger
      :title="target?.action === 'delete' ? 'Borrar de forma definitiva' : 'Ocultar contenido'"
      :message="target?.action === 'delete' ? 'Se borra del evento y no se puede deshacer.' : 'Deja de verse para los invitados; se puede volver a mostrar.'"
      :confirm-label="target?.action === 'delete' ? 'Borrar' : 'Ocultar'"
      @confirm="confirm"
    />
  </div>
</template>

<style scoped>
.sub { border-bottom: 1px solid var(--line); }
.tab { min-height: 44px; }
.dim { opacity: 0.55; transition: opacity 0.15s ease-out; }
.list { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 4px; border-bottom: 1px solid var(--line); }
.row:last-child { border-bottom: 0; }
.main { flex: 1 1 240px; min-width: 0; }
.text { overflow-wrap: anywhere; white-space: pre-wrap; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; }
.btn { min-height: 44px; }
.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 16px; }
.photo { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.thumb { aspect-ratio: 1; background: var(--cream-200); border-radius: 10px; display: grid; place-items: center; overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.title { overflow-wrap: anywhere; }
:deep(.v-table) { overflow-x: auto; }
</style>
