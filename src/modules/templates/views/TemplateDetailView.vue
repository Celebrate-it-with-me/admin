<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ReasonDialog from '@/components/ReasonDialog.vue'
import VersionStatusChip from '../components/VersionStatusChip.vue'
import { archiveVersion, createDraft, getTemplate } from '../services/templatesApi'
import { eventTypeLabel, eventsLabel, explainError, formatDate } from '../logic'
import type { TemplateDetail, VersionRow } from '../types'

const props = defineProps<{ id: number }>()
const router = useRouter()

const template = ref<TemplateDetail | null>(null)
const loading = ref(true)
const failed = ref(false)
const notice = ref('')
const actionError = ref('')
const creating = ref(false)
const archiving = ref<VersionRow | null>(null)
const archiveBusy = ref(false)
const archiveError = ref('')

const load = async () => {
  loading.value = true
  failed.value = false
  try { template.value = await getTemplate(props.id) } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const openEditor = (versionId: number) => router.push({ name: 'TemplateEditor', params: { id: props.id, versionId } })
const draft = computed(() => template.value?.versions.find(v => v.status === 'draft') ?? null)

const create = async () => {
  creating.value = true
  actionError.value = ''
  try {
    const v = await createDraft(props.id)
    await openEditor(v.id)
  } catch (e) {
    const x = explainError(e)
    // A draft already exists: take the person to it instead of failing.
    if (x.code === 'draft_exists' && x.draftVersionId) { await openEditor(x.draftVersionId); return }
    actionError.value = x.message
  } finally { creating.value = false }
}

const confirmArchive = async (reason: string) => {
  if (!archiving.value) return
  archiveBusy.value = true
  archiveError.value = ''
  try {
    const v = archiving.value
    await archiveVersion(v.id, reason)
    archiving.value = null
    notice.value = `El borrador de la versión ${v.version} se archivó.`
    await load()
  } catch (e) { archiveError.value = explainError(e).message } finally { archiveBusy.value = false }
}

const dialogOpen = computed({ get: () => archiving.value !== null, set: v => { if (!v) { archiving.value = null; archiveError.value = '' } } })
const actionLabel = (v: VersionRow) => (v.status === 'draft' ? 'Abrir' : 'Ver')
</script>

<template>
  <div>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="{ name: 'Templates' }" class="mb-2 ml-n3">Plantillas</v-btn>

    <div v-if="loading && !template" aria-busy="true" role="status" aria-label="Cargando la plantilla">
      <v-skeleton-loader type="heading, list-item-two-line, list-item-two-line" />
    </div>

    <v-card v-else-if="failed && !template" class="pa-6 text-center">
      <p class="mb-3">No pudimos cargar la plantilla.</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <div v-else-if="template" :class="{ dim: loading }" :aria-busy="loading">
      <div class="top">
        <div>
          <h2 class="title">{{ template.name }}</h2>
          <p class="text-medium-emphasis mb-0">
            {{ eventTypeLabel(template) }} · {{ eventsLabel(template.eventsCount) }}
            <template v-if="template.currentVersion"> · publicada: versión {{ template.currentVersion.version }}</template>
          </p>
        </div>
        <div class="actions">
          <v-btn v-if="draft" color="primary" variant="flat" prepend-icon="mdi-pencil-outline" class="tap" @click="openEditor(draft.id)">Abrir borrador</v-btn>
          <v-btn v-else color="primary" variant="flat" prepend-icon="mdi-plus" class="tap" :loading="creating" @click="create">Crear borrador</v-btn>
        </div>
      </div>

      <v-alert v-if="notice" type="success" variant="tonal" density="compact" closable class="mb-3" aria-live="polite" @click:close="notice = ''">{{ notice }}</v-alert>
      <v-alert v-if="actionError" type="error" variant="tonal" density="compact" closable class="mb-3" @click:close="actionError = ''">{{ actionError }}</v-alert>
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mb-3">
        No pudimos actualizar.
        <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <h3 class="section mb-2">Historial de versiones</h3>

      <v-card class="d-none d-md-block">
        <v-table>
          <caption class="visually-hidden">Versiones de {{ template.name }}</caption>
          <thead>
            <tr>
              <th scope="col">Versión</th><th scope="col">Estado</th><th scope="col">Creada</th><th scope="col">Publicada</th>
              <th scope="col" class="text-right">Eventos</th><th scope="col">Notas</th><th scope="col"><span class="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in template.versions" :key="v.id">
              <th scope="row">Versión {{ v.version }}</th>
              <td><VersionStatusChip :status="v.status" /></td>
              <td>{{ formatDate(v.createdAt) }}</td>
              <td>{{ formatDate(v.publishedAt) }}</td>
              <td class="text-right">{{ v.eventsCount }}</td>
              <td class="notes">{{ v.notes || '—' }}</td>
              <td class="text-right nowrap">
                <v-btn size="small" variant="tonal" @click="openEditor(v.id)">{{ actionLabel(v) }}</v-btn>
                <v-btn v-if="v.status === 'draft'" size="small" variant="text" color="error" class="ml-1" @click="archiving = v">Archivar</v-btn>
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <ul class="cards d-md-none">
        <li v-for="v in template.versions" :key="v.id">
          <v-card class="pa-4">
            <div class="d-flex align-center ga-2 mb-2">
              <strong>Versión {{ v.version }}</strong><VersionStatusChip :status="v.status" />
            </div>
            <dl class="facts">
              <dt>Creada</dt><dd>{{ formatDate(v.createdAt) }}</dd>
              <dt>Publicada</dt><dd>{{ formatDate(v.publishedAt) }}</dd>
              <dt>Eventos</dt><dd>{{ v.eventsCount }}</dd>
              <dt>Notas</dt><dd>{{ v.notes || '—' }}</dd>
            </dl>
            <div class="d-flex ga-2 mt-3">
              <v-btn variant="tonal" class="tap flex-grow-1" @click="openEditor(v.id)">{{ actionLabel(v) }}</v-btn>
              <v-btn v-if="v.status === 'draft'" variant="text" color="error" class="tap" @click="archiving = v">Archivar</v-btn>
            </div>
          </v-card>
        </li>
      </ul>
    </div>

    <ReasonDialog
      v-model="dialogOpen"
      :title="`Archivar el borrador de la versión ${archiving?.version ?? ''}`"
      message="El borrador se guarda como archivado y ya no se podrá abrir para editar. La versión publicada no cambia."
      confirm-label="Archivar borrador"
      danger
      :loading="archiveBusy"
      :error="archiveError"
      @confirm="confirmArchive"
    />
  </div>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.title { font-size: 1.6rem; margin: 0 0 4px; overflow-wrap: anywhere; }
.section { font-size: 1.2rem; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.notes { max-width: 28ch; }
.nowrap { white-space: nowrap; }
.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; margin: 0; }
.facts dt { color: var(--ink-500); }
.facts dd { margin: 0; overflow-wrap: anywhere; }
.tap { min-height: 44px; }
.actions { max-width: 100%; }
@media (max-width: 599px) { .actions, .actions .v-btn { width: 100%; } }
</style>
