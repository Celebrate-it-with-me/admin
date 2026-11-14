<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import PreviewPane from '../components/PreviewPane.vue'
import PublishDialog from '../components/PublishDialog.vue'
import SectionList from '../components/SectionList.vue'
import ThemeEditor from '../components/ThemeEditor.vue'
import VersionStatusChip from '../components/VersionStatusChip.vue'
import { getTemplate, getVersion, publishVersion, saveDraft } from '../services/templatesApi'
import {
  eventTypeSlug, explainError, formatDate, sectionProblems, snapshot, themeProblems, toBody, toEditorSections, unplacedErrors,
} from '../logic'
import type { EditorSection, FieldErrors, TemplateDetail, TemplateVersion, Theme } from '../types'

const props = defineProps<{ id: number; versionId: number }>()
const router = useRouter()
const { mdAndUp } = useDisplay()

const template = ref<TemplateDetail | null>(null)
const version = ref<TemplateVersion | null>(null)
const rows = ref<EditorSection[]>([])
const theme = ref<Theme | null>(null)
const notes = ref('')
const savedSnapshot = ref('')

const loading = ref(true)
const failed = ref(false)
const saving = ref(false)
const serverErrors = ref<FieldErrors>({})
const saveError = ref('')
const notice = ref('')
const tab = ref<'edit' | 'preview'>('edit')

const readonly = computed(() => version.value?.status !== 'draft')

const apply = (v: TemplateVersion) => {
  version.value = v
  rows.value = toEditorSections(v.sections)
  theme.value = JSON.parse(JSON.stringify(v.theme)) as Theme
  notes.value = v.notes ?? ''
  serverErrors.value = {}
  savedSnapshot.value = snapshot(toBody(rows.value, theme.value, notes.value))
}

const load = async () => {
  loading.value = true
  failed.value = false
  try {
    const [t, v] = await Promise.all([getTemplate(props.id), getVersion(props.versionId)])
    template.value = t
    apply(v)
  } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const body = computed(() => (theme.value ? toBody(rows.value, theme.value, notes.value) : null))
const dirty = computed(() => !readonly.value && body.value !== null && snapshot(body.value) !== savedSnapshot.value)

// Editing clears what the server said before: those messages described the previous text.
watch([rows, theme, notes], () => { if (Object.keys(serverErrors.value).length) serverErrors.value = {} }, { deep: true })

const localErrors = computed<FieldErrors>(() => ({ ...sectionProblems(rows.value), ...(theme.value ? themeProblems(theme.value) : {}) }))
const errors = computed<FieldErrors>(() => ({ ...serverErrors.value, ...localErrors.value }))
const errorCount = computed(() => Object.keys(errors.value).length)
const otherErrors = computed(() => unplacedErrors(errors.value, rows.value.length))

const save = async (): Promise<boolean> => {
  if (!body.value || readonly.value) return false
  saveError.value = ''
  notice.value = ''
  if (Object.keys(localErrors.value).length) {
    saveError.value = 'Corrige los campos marcados antes de guardar.'
    return false
  }
  saving.value = true
  try {
    const v = await saveDraft(props.versionId, body.value)
    version.value = v
    serverErrors.value = {}
    savedSnapshot.value = snapshot(body.value)
    notice.value = 'Borrador guardado.'
    return true
  } catch (e) {
    const x = explainError(e)
    saveError.value = x.message
    if (x.status === 422) serverErrors.value = x.fields
    if (x.code === 'version_immutable') await load()
    return false
  } finally { saving.value = false }
}

// Publishing
const publishOpen = ref(false)
const publishing = ref(false)
const publishError = ref('')
const previous = computed(() => template.value?.versions.find(v => v.status === 'published' && v.id !== props.versionId) ?? null)

const confirmPublish = async (reason: string) => {
  publishing.value = true
  publishError.value = ''
  try {
    const r = await publishVersion(props.versionId, reason)
    publishOpen.value = false
    await load()
    const n = r.eventsOnPreviousVersion
    notice.value = `Versión ${r.version.version} publicada. ${n === 1 ? '1 evento sigue' : `${n} eventos siguen`} en la versión anterior y no cambia${n === 1 ? '' : 'n'}.`
  } catch (e) {
    const x = explainError(e)
    publishError.value = x.message
    if (x.code === 'version_immutable') { publishOpen.value = false; await load(); saveError.value = x.message }
  } finally { publishing.value = false }
}

// Unsaved changes: ask before leaving the route, and before closing the tab.
const leaveOpen = ref(false)
let leaveResolve: ((leave: boolean) => void) | null = null
const askLeave = () => new Promise<boolean>(resolve => { leaveResolve = resolve; leaveOpen.value = true })
const answerLeave = (leave: boolean) => { leaveOpen.value = false; leaveResolve?.(leave); leaveResolve = null }
onBeforeRouteLeave(() => (dirty.value ? askLeave() : true))
const beforeUnload = (e: BeforeUnloadEvent) => { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))

const back = () => router.push({ name: 'TemplateDetail', params: { id: props.id } })
const eventType = computed(() => (template.value ? eventTypeSlug(template.value) : 'quinceanera'))
</script>

<template>
  <div>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="mb-2 ml-n3" @click="back">{{ template?.name ?? 'Plantilla' }}</v-btn>

    <div v-if="loading && !version" aria-busy="true" role="status" aria-label="Cargando el editor">
      <v-skeleton-loader type="heading, list-item-two-line, list-item-two-line, list-item-two-line" />
    </div>

    <v-card v-else-if="failed && !version" class="pa-6 text-center">
      <p class="mb-3">No pudimos cargar esta versión.</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <div v-else-if="version && theme" :class="{ dim: loading }" :aria-busy="loading">
      <div class="top">
        <div class="min-w-0">
          <h2 class="title">Versión {{ version.version }} <VersionStatusChip :status="version.status" class="ml-2 align-middle" /></h2>
          <p class="text-medium-emphasis mb-0 small">
            {{ template?.name }}
            <template v-if="version.status === 'published'"> · publicada el {{ formatDate(version.publishedAt) }}</template>
            <template v-if="dirty"> · <strong class="text-warning-dark">cambios sin guardar</strong></template>
          </p>
        </div>
        <div v-if="!readonly" class="actions">
          <v-btn variant="tonal" prepend-icon="mdi-content-save-outline" class="tap" :loading="saving" :disabled="!dirty" @click="save">Guardar borrador</v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-rocket-launch-outline" class="tap" :disabled="dirty || saving || errorCount > 0" @click="publishOpen = true">Publicar</v-btn>
        </div>
      </div>
      <p v-if="!readonly && dirty" class="text-caption text-medium-emphasis mt-n3 mb-3">Guarda el borrador antes de publicar.</p>

      <v-alert v-if="readonly" type="info" variant="tonal" density="compact" class="mb-3">
        Esta versión está {{ version.status === 'published' ? 'publicada' : 'archivada' }} y no se puede modificar. Puedes verla y probar la vista previa.
        <template v-if="version.status === 'published'"> Para cambiarla, crea un borrador nuevo desde la plantilla.</template>
      </v-alert>
      <v-alert v-if="notice" type="success" variant="tonal" density="compact" closable class="mb-3" aria-live="polite" @click:close="notice = ''">{{ notice }}</v-alert>
      <v-alert v-if="saveError" type="error" variant="tonal" density="compact" closable class="mb-3" role="alert" @click:close="saveError = ''">
        {{ saveError }}
        <ul v-if="otherErrors.length" class="mt-1 pl-4"><li v-for="(m, n) in otherErrors" :key="n">{{ m }}</li></ul>
      </v-alert>

      <v-tabs v-if="!mdAndUp" v-model="tab" grow class="mb-3" aria-label="Editor y vista previa">
        <v-tab value="edit" prepend-icon="mdi-pencil-outline">Editar</v-tab>
        <v-tab value="preview" prepend-icon="mdi-eye-outline">Vista previa</v-tab>
      </v-tabs>

      <div class="split">
        <div v-show="mdAndUp || tab === 'edit'" class="edit">
          <h3 class="h">Secciones</h3>
          <SectionList v-model="rows" :errors="errors" :readonly="readonly" />

          <h3 class="h mt-6">Colores y tipografías</h3>
          <ThemeEditor v-model="theme" :errors="errors" :readonly="readonly" />

          <h3 class="h mt-2">Notas de la versión</h3>
          <v-textarea v-model="notes" label="Notas (qué cambia en esta versión)" rows="2" auto-grow density="comfortable" :readonly="readonly" maxlength="500" counter="500" :error-messages="errors.notes" />
        </div>

        <div v-show="mdAndUp || tab === 'preview'" class="prev">
          <PreviewPane :sections="rows" :theme="theme" :event-type="eventType" :visible="mdAndUp || tab === 'preview'" />
        </div>
      </div>
    </div>

    <PublishDialog
      v-if="version"
      v-model="publishOpen"
      :version="version.version"
      :previous-version="previous?.version ?? null"
      :events-on-previous="previous?.eventsCount ?? 0"
      :loading="publishing"
      :error="publishError"
      @confirm="confirmPublish"
    />

    <v-dialog v-model="leaveOpen" max-width="440" persistent @keydown.esc="answerLeave(false)">
      <v-card class="pa-2">
        <v-card-title class="leave-title">¿Salir sin guardar?</v-card-title>
        <v-card-text>Hay cambios en el borrador que no se han guardado. Si sales, se pierden.</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="answerLeave(false)">Seguir editando</v-btn>
          <v-btn color="error" variant="flat" @click="answerLeave(true)">Salir y descartar</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.title { font-size: 1.5rem; margin: 0 0 2px; }
.align-middle { vertical-align: middle; }
.small { font-size: 0.9rem; }
.min-w-0 { min-width: 0; }
.text-warning-dark { color: #8a5a00; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.tap { min-height: 44px; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.h { font-size: 1.15rem; margin-bottom: 10px; }
.split { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); }
.edit, .prev { min-width: 0; }
@media (min-width: 960px) {
  .split { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; }
  .prev { position: sticky; top: 16px; }
}
@media (max-width: 599px) { .actions, .actions .v-btn { width: 100%; } }
.leave-title { font-family: var(--font-heading); font-size: 1.3rem; font-weight: 500; }
</style>
