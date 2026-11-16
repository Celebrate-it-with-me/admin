<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import ReasonDialog from '@/components/ReasonDialog.vue'
import PackagePreviewPane from '../components/PackagePreviewPane.vue'
import ValidationReport from '../components/ValidationReport.vue'
import { discardStage, installPackage, validatePackage } from '../packagesApi'
import { checkZip, explainPackageError, hasZipSignature, formatBytes, formatDateTime, presetOptions } from '../logic'
import type { ValidateResult } from '../types'
import type { EventTypeSlug } from '../../types'

const router = useRouter()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const file = ref<File | null>(null)
const uploading = ref(false)
const progress = ref(0)
const fileError = ref('')
const requestError = ref('')
const result = ref<ValidateResult | null>(null)
const tab = ref<'report' | 'preview'>('report')

const install = ref({ open: false, busy: false, error: '', existingId: null as number | null, differences: [] as string[] })

const choose = () => fileInput.value?.click()
const reset = async (discard = true) => {
  const token = result.value?.stageToken
  result.value = null
  file.value = null
  fileError.value = ''
  requestError.value = ''
  progress.value = 0
  tab.value = 'report'
  if (fileInput.value) fileInput.value.value = ''
  if (discard && token) { try { await discardStage(token) } catch { /* it expires by itself in 24 h */ } }
}

const upload = async (f: File) => {
  fileError.value = ''
  requestError.value = ''
  const problem = checkZip(f)
  if (problem) { fileError.value = problem; return }
  if (!(await hasZipSignature(f))) { fileError.value = 'El archivo no es un .zip válido.'; return }
  if (result.value) await reset()
  file.value = f
  uploading.value = true
  progress.value = 0
  try {
    result.value = await validatePackage(f, p => { progress.value = p })
  } catch (e) {
    requestError.value = explainPackageError(e).message
    file.value = null
  } finally { uploading.value = false }
}

const onPick = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) void upload(f)
}
const onDrop = (e: DragEvent) => {
  dragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) void upload(f)
}

const valid = computed(() => Boolean(result.value?.valid && result.value.stageToken))
const manifest = computed(() => result.value?.report.manifest ?? null)
const presets = computed(() => presetOptions(manifest.value?.presets))
const eventTypes = computed<EventTypeSlug[]>(() => manifest.value?.eventTypes?.length ? manifest.value.eventTypes : ['quinceanera', 'wedding'])

const confirmInstall = async (reason: string) => {
  const token = result.value?.stageToken
  if (!token) return
  install.value.busy = true
  install.value.error = ''
  install.value.existingId = null
  install.value.differences = []
  try {
    const pkg = await installPackage(token, reason)
    result.value = null
    install.value.open = false
    await router.push({ name: 'TemplatePackageDetail', params: { id: pkg.id }, query: { installed: '1' } })
  } catch (e) {
    const x = explainPackageError(e)
    install.value.error = x.message
    install.value.differences = x.differences
    install.value.existingId = x.code === 'package_exists' ? x.packageId : null
    if (x.code === 'stage_expired' || x.code === 'stage_not_found') { install.value.open = false; await reset(false); requestError.value = x.message }
  } finally { install.value.busy = false }
}

onBeforeUnmount(() => {
  const token = result.value?.stageToken
  if (token) void discardStage(token).catch(() => {})
})
</script>

<template>
  <div>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="{ name: 'TemplatePackages' }" class="mb-2 ml-n3">Paquetes</v-btn>
    <h2 class="title">Subir un paquete de plantilla</h2>
    <p class="text-medium-emphasis intro">
      Sube el .zip del diseñador. Se valida en el servidor (estructura, CSS, SVG, HTML, licencias y peso) y, si no tiene errores, queda como borrador para revisarlo antes de activarlo.
    </p>

    <input ref="fileInput" type="file" accept=".zip,application/zip" class="visually-hidden" tabindex="-1" aria-hidden="true" data-testid="file-input" @change="onPick" />

    <!-- Step 1: choose the zip -->
    <div
      v-if="!result"
      class="drop" :class="{ over: dragging, busy: uploading }"
      data-testid="dropzone"
      @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop"
    >
      <template v-if="uploading">
        <v-icon icon="mdi-zip-box-outline" size="36" />
        <p class="name">{{ file?.name }} <span class="text-medium-emphasis">({{ formatBytes(file?.size) }})</span></p>
        <v-progress-linear :model-value="Math.round(progress * 100)" height="8" rounded color="primary" aria-label="Progreso de la subida" class="bar" />
        <p class="text-medium-emphasis mb-0" role="status">{{ progress < 1 ? `Subiendo… ${Math.round(progress * 100)} %` : 'Validando el paquete…' }}</p>
      </template>
      <template v-else>
        <v-icon icon="mdi-cloud-upload-outline" size="40" />
        <p class="lead">Arrastra aquí el archivo .zip</p>
        <p class="text-medium-emphasis">o elígelo desde tu equipo. Solo .zip, máximo 8 MB.</p>
        <v-btn variant="flat" color="primary" prepend-icon="mdi-folder-open-outline" class="tap" @click="choose">Elegir archivo</v-btn>
      </template>
    </div>
    <v-alert v-if="fileError" type="error" variant="tonal" density="compact" class="mt-3" role="alert" data-testid="file-error">{{ fileError }}</v-alert>
    <v-alert v-if="requestError" type="error" variant="tonal" density="compact" class="mt-3" role="alert" data-testid="request-error">
      {{ requestError }}
      <template v-if="file" #append><v-btn size="small" variant="text" @click="upload(file)">Reintentar</v-btn></template>
    </v-alert>

    <!-- Step 2: report and preview -->
    <div v-if="result" class="result">
      <div class="head">
        <div class="min">
          <h3 class="h">
            <template v-if="manifest">{{ manifest.slug }} <span class="ver">{{ manifest.version }}</span></template>
            <template v-else>Informe de validación</template>
          </h3>
          <p v-if="manifest" class="text-medium-emphasis mb-0 small">
            Nivel {{ manifest.level }} · {{ manifest.visibility === 'private' ? 'Privado' : 'Público' }} · {{ manifest.tier === 'free' ? 'Gratis' : 'Premium' }}
            <template v-if="file"> · {{ file.name }}</template>
          </p>
          <p v-if="valid && result.expiresAt" class="text-caption text-medium-emphasis mb-0">Esta subida se conserva hasta {{ formatDateTime(result.expiresAt) }}.</p>
        </div>
        <div class="actions">
          <v-btn variant="text" prepend-icon="mdi-upload" class="tap" @click="reset()">Subir otro</v-btn>
          <v-btn v-if="valid" color="primary" variant="flat" prepend-icon="mdi-package-down" class="tap" @click="install.open = true; install.error = ''">Instalar como borrador</v-btn>
        </div>
      </div>

      <v-alert v-if="!valid" type="error" variant="tonal" density="compact" class="mb-3" role="alert">
        El paquete tiene errores y no se puede instalar. Corrige lo que marca el informe y súbelo de nuevo.
      </v-alert>

      <v-tabs v-if="valid" v-model="tab" class="mb-3" grow aria-label="Informe y vista previa">
        <v-tab value="report" prepend-icon="mdi-clipboard-check-outline">Informe</v-tab>
        <v-tab value="preview" prepend-icon="mdi-eye-outline">Vista previa</v-tab>
      </v-tabs>

      <ValidationReport v-show="!valid || tab === 'report'" :report="result.report" />
      <div v-if="valid && result.stageToken" v-show="tab === 'preview'" class="mt-2">
        <PackagePreviewPane :stage-token="result.stageToken" :event-types="eventTypes" :presets="presets" :visible="tab === 'preview'" />
      </div>
    </div>

    <ReasonDialog
      v-model="install.open"
      :title="`Instalar ${manifest?.slug ?? ''} ${manifest?.version ?? ''}`"
      message="Se crea como borrador: ninguna organizadora lo ve hasta que se active. El paquete instalado no se edita; para cambiarlo se instala otra versión."
      confirm-label="Instalar"
      :loading="install.busy"
      :error="install.error"
      @confirm="confirmInstall"
    >
      <ul v-if="install.differences.length" class="mb-3 text-body-2" data-testid="stage-differences">
        <li v-for="d in install.differences" :key="d"><code>{{ d }}</code></li>
      </ul>
      <v-btn v-if="install.existingId" variant="tonal" size="small" class="mb-3" :to="{ name: 'TemplatePackageDetail', params: { id: install.existingId } }">Ver el paquete instalado</v-btn>
    </ReasonDialog>
  </div>
</template>

<style scoped>
.title { font-size: 1.6rem; margin: 0 0 4px; }
.intro { max-width: 70ch; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.drop {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 32px 20px;
  border: 2px dashed var(--line); border-radius: 12px; background: var(--cream-200); transition: border-color 0.15s ease-out, background-color 0.15s ease-out;
}
.drop.over { border-color: var(--rose-700); background: rgba(176, 74, 98, 0.07); }
.lead { font-size: 1.1rem; font-weight: 600; margin: 6px 0 0; }
.name { font-weight: 600; margin: 8px 0; overflow-wrap: anywhere; }
.bar { max-width: 420px; margin: 0 0 8px; }
.result { margin-top: 8px; }
.head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.min { min-width: 0; }
.h { font-size: 1.3rem; margin: 0 0 2px; overflow-wrap: anywhere; }
.ver { font-weight: 400; color: var(--ink-500); }
.small { font-size: 0.9rem; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.tap { min-height: 44px; }
@media (max-width: 599px) { .actions, .actions .v-btn { width: 100%; } }
</style>
