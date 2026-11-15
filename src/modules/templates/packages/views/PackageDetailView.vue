<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUserStore } from '@/store/currentUser'
import ActivateDialog from '../components/ActivateDialog.vue'
import GrantsPanel from '../components/GrantsPanel.vue'
import ImpactDialog from '../components/ImpactDialog.vue'
import PackagePreviewPane from '../components/PackagePreviewPane.vue'
import PackageStatusChip from '../components/PackageStatusChip.vue'
import QualityChecklist from '../components/QualityChecklist.vue'
import ThirdPartyMarksBanner from '../components/ThirdPartyMarksBanner.vue'
import {
  TIER_LABEL, VISIBILITY_LABEL, canActivate, canDeactivate, canWithdraw, checklistDone, eventTypesLabel, eventsPinnedLabel, explainPackageError,
  formatBytes, formatDateTime, loadChecklist, presetOptions, saveChecklist, type ChecklistState,
} from '../logic'
import { activatePackage, deactivatePackage, getPackage, withdrawPackage } from '../packagesApi'
import type { Package } from '../types'

const props = defineProps<{ id: number }>()
const route = useRoute()
const router = useRouter()
const user = useCurrentUserStore()

const pkg = ref<Package | null>(null)
const loading = ref(true)
const failed = ref(false)
const failedMessage = ref('')
const notice = ref(route.query.installed ? 'Paquete instalado como borrador. Revísalo con la vista previa y la lista de comprobación, y actívalo cuando esté aprobado.' : '')
const actionError = ref('')
const tab = ref<'summary' | 'review' | 'grants'>(route.query.installed ? 'review' : 'summary')

const load = async () => {
  loading.value = true
  failed.value = false
  try { pkg.value = await getPackage(props.id) } catch (e) { failed.value = true; failedMessage.value = explainPackageError(e).message } finally { loading.value = false }
}
onMounted(load)

const checklist = ref<ChecklistState>(loadChecklist(props.id))
watch(checklist, v => saveChecklist(props.id, v), { deep: true })
const reviewer = computed(() => user.user?.name || user.user?.email || 'Revisor')
const reviewed = computed(() => checklistDone(checklist.value))

const marks = computed(() => pkg.value?.manifest.thirdPartyMarks ?? [])
const credits = computed(() => pkg.value?.manifest.assetsCredits ?? [])
const presets = computed(() => presetOptions(pkg.value?.manifest.presets))
const isPrivate = computed(() => pkg.value?.visibility === 'private')
const installedBy = computed(() => {
  const by = pkg.value?.installedBy
  return typeof by === 'string' ? by : by?.name ?? ''
})
const description = computed(() => pkg.value?.manifest.description?.es ?? '')

// activate
const activate = ref({ open: false, busy: false, error: '' })
const doActivate = async (reason: string, ack: boolean | undefined) => {
  activate.value.busy = true
  activate.value.error = ''
  try {
    const r = await activatePackage(props.id, reason, ack)
    activate.value.open = false
    pkg.value = r.package
    const n = r.eventsOnPreviousVersion
    notice.value = `Paquete activado. ${n === 0 ? 'Ningún evento queda' : n === 1 ? '1 evento sigue' : `${n} eventos siguen`} en la versión anterior y no cambia${n === 1 ? '' : 'n'}.`
  } catch (e) {
    const x = explainPackageError(e)
    activate.value.error = x.message
    if (x.code === 'package_not_installable') { activate.value.open = false; actionError.value = x.message; await load() }
  } finally { activate.value.busy = false }
}

// deactivate / withdraw
const impact = ref({ open: false, action: 'deactivate' as 'deactivate' | 'withdraw', busy: false, error: '' })
const openImpact = (action: 'deactivate' | 'withdraw') => { impact.value = { open: true, action, busy: false, error: '' } }
const doImpact = async (reason: string) => {
  impact.value.busy = true
  impact.value.error = ''
  try {
    if (impact.value.action === 'deactivate') {
      pkg.value = await deactivatePackage(props.id, reason)
      impact.value.open = false
      notice.value = 'Paquete desactivado. Los eventos publicados no cambian.'
    } else {
      await withdrawPackage(props.id, reason)
      impact.value.open = false
      await router.push({ name: 'TemplatePackages' })
    }
  } catch (e) {
    const x = explainPackageError(e)
    impact.value.error = x.code === 'package_in_use' && x.eventsPinned != null ? `${x.message} (${eventsPinnedLabel(x.eventsPinned)}).` : x.message
    if (x.code === 'package_not_active') { impact.value.open = false; actionError.value = x.message; await load() }
  } finally { impact.value.busy = false }
}

const tabs = computed(() => [
  { value: 'summary', title: 'Resumen', icon: 'mdi-information-outline' },
  { value: 'review', title: 'Revisión', icon: 'mdi-eye-check-outline' },
  ...(isPrivate.value ? [{ value: 'grants', title: 'Accesos', icon: 'mdi-key-outline' }] : []),
])
const templateLink = (id: number) => ({ name: 'TemplateDetail', params: { id } })
const versionLabel: Record<string, string> = { draft: 'Borrador', published: 'Publicada', archived: 'Archivada' }
</script>

<template>
  <div>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" :to="{ name: 'TemplatePackages' }" class="mb-2 ml-n3">Paquetes</v-btn>

    <div v-if="loading && !pkg" aria-busy="true" role="status" aria-label="Cargando el paquete">
      <v-skeleton-loader type="heading, list-item-two-line, list-item-two-line" />
    </div>

    <v-card v-else-if="failed && !pkg" class="pa-6 text-center">
      <p class="mb-3">{{ failedMessage || 'No pudimos cargar el paquete.' }}</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <div v-else-if="pkg" :class="{ dim: loading }" :aria-busy="loading">
      <div class="top">
        <div class="min">
          <h2 class="title">{{ pkg.name.es }} <span class="ver">{{ pkg.semver }}</span></h2>
          <p class="text-medium-emphasis mb-2">{{ pkg.slug }} · {{ eventTypesLabel(pkg.eventTypes) }}</p>
          <div class="chips">
            <PackageStatusChip :status="pkg.status" />
            <v-chip size="small" variant="tonal" :prepend-icon="isPrivate ? 'mdi-lock-outline' : 'mdi-earth'">{{ VISIBILITY_LABEL[pkg.visibility] }}</v-chip>
            <v-chip size="small" variant="tonal">{{ TIER_LABEL[pkg.tier] ?? pkg.tier }}</v-chip>
            <v-chip size="small" variant="tonal">Nivel {{ pkg.level }}</v-chip>
          </div>
        </div>
        <div class="actions">
          <v-btn v-if="canActivate(pkg)" color="primary" variant="flat" prepend-icon="mdi-check-decagram-outline" class="tap" :disabled="!reviewed" data-testid="activate" @click="activate.open = true; activate.error = ''">Activar</v-btn>
          <v-btn v-if="canDeactivate(pkg)" variant="tonal" prepend-icon="mdi-pause-circle-outline" class="tap" data-testid="deactivate" @click="openImpact('deactivate')">Desactivar</v-btn>
          <v-btn v-if="canWithdraw(pkg)" variant="text" color="error" prepend-icon="mdi-archive-arrow-down-outline" class="tap" data-testid="withdraw" @click="openImpact('withdraw')">Retirar</v-btn>
        </div>
      </div>
      <p v-if="canActivate(pkg) && !reviewed" class="text-caption text-medium-emphasis mt-n2 mb-3">Para activar, completa la lista de comprobación en la pestaña Revisión.</p>

      <v-alert v-if="notice" type="success" variant="tonal" density="compact" closable class="mb-3" aria-live="polite" @click:close="notice = ''">{{ notice }}</v-alert>
      <v-alert v-if="actionError" type="error" variant="tonal" density="compact" closable class="mb-3" role="alert" @click:close="actionError = ''">{{ actionError }}</v-alert>
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mb-3">
        No pudimos actualizar. <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>
      <ThirdPartyMarksBanner v-if="marks.length" class="mb-4" :marks="marks" />

      <v-tabs v-model="tab" class="mb-4" aria-label="Secciones del paquete">
        <v-tab v-for="t in tabs" :key="t.value" :value="t.value" :prepend-icon="t.icon">{{ t.title }}</v-tab>
      </v-tabs>

      <!-- Summary -->
      <div v-show="tab === 'summary'" class="summary">
        <p v-if="description" class="desc">{{ description }}</p>
        <dl class="facts">
          <dt>Versión</dt><dd>{{ pkg.semver }}</dd>
          <dt>Huella</dt><dd><code>{{ pkg.contentHash ? pkg.contentHash.slice(0, 16) : '—' }}</code></dd>
          <dt>Motor mínimo</dt><dd>{{ pkg.engineMin }}</dd>
          <dt>Autor</dt>
          <dd>{{ pkg.author?.name ?? '—' }}<a v-if="pkg.author?.url" :href="pkg.author.url" target="_blank" rel="noopener noreferrer" class="ml-2">{{ pkg.author.url }}</a></dd>
          <dt>Licencia</dt><dd>{{ pkg.manifest.license?.id ?? '—' }}<span v-if="pkg.manifest.license?.summary" class="text-medium-emphasis"> · {{ pkg.manifest.license.summary }}</span></dd>
          <dt>Peso</dt><dd>{{ formatBytes(pkg.sizeBytes) }}</dd>
          <dt>Instalado</dt><dd>{{ formatDateTime(pkg.installedAt) }}<template v-if="installedBy"> · {{ installedBy }}</template></dd>
          <dt>Eventos fijados</dt><dd>{{ eventsPinnedLabel(pkg.eventsPinned) }}</dd>
        </dl>

        <h3 class="h">Plantillas y versiones</h3>
        <p class="text-medium-emphasis small">Las versiones de un paquete las gestiona el paquete: no se editan en el constructor. Para cambiar algo se instala otra versión.</p>
        <ul class="plain">
          <li v-for="t in pkg.templates" :key="t.id" class="row">
            <router-link :to="templateLink(t.id)">{{ t.slug }}</router-link>
            <v-chip v-if="t.versionStatus" size="x-small" variant="tonal">{{ versionLabel[t.versionStatus] }}</v-chip>
          </li>
        </ul>

        <h3 class="h">Créditos y licencias de los assets</h3>
        <p v-if="credits.length === 0" class="text-medium-emphasis">El paquete no trae assets.</p>
        <div v-else class="scroll">
          <table class="tbl">
            <caption class="visually-hidden">Créditos de los assets</caption>
            <thead><tr><th scope="col">Archivo</th><th scope="col">Título</th><th scope="col">Autor</th><th scope="col">Licencia</th><th scope="col">Origen</th></tr></thead>
            <tbody>
              <tr v-for="c in credits" :key="c.path">
                <th scope="row"><code>{{ c.path }}</code></th><td>{{ c.title }}</td><td>{{ c.author }}</td><td>{{ c.license }}</td>
                <td><a v-if="c.url" :href="c.url" target="_blank" rel="noopener noreferrer">{{ c.source }}</a><template v-else>{{ c.source }}</template></td>
              </tr>
            </tbody>
          </table>
        </div>

        <v-expansion-panels variant="accordion" class="mt-4">
          <v-expansion-panel :title="`Archivos del paquete (${pkg.files.length})`">
            <v-expansion-panel-text>
              <div class="scroll">
                <table class="tbl">
                  <caption class="visually-hidden">Archivos</caption>
                  <thead><tr><th scope="col">Ruta</th><th scope="col">Peso</th><th scope="col">Tipo</th></tr></thead>
                  <tbody><tr v-for="f in pkg.files" :key="f.path"><th scope="row"><code>{{ f.path }}</code></th><td>{{ formatBytes(f.size) }}</td><td>{{ f.mime }}</td></tr></tbody>
                </table>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </div>

      <!-- Review: preview + checklist -->
      <div v-show="tab === 'review'" class="review">
        <PackagePreviewPane v-if="tab === 'review'" :package-id="pkg.id" :event-types="pkg.eventTypes" :presets="presets" :visible="tab === 'review'" />
        <div>
          <QualityChecklist v-model="checklist" :reviewer="reviewer" :readonly="pkg.status === 'withdrawn'" />
          <p class="text-caption text-medium-emphasis mt-2">Este registro se guarda en este navegador; la auditoría de la activación guarda el motivo y quién activó.</p>
        </div>
      </div>

      <div v-if="isPrivate" v-show="tab === 'grants'"><GrantsPanel :package-id="pkg.id" /></div>
    </div>

    <ActivateDialog
      v-if="pkg" v-model="activate.open" :name="pkg.name.es" :semver="pkg.semver" :marks="marks"
      :loading="activate.busy" :error="activate.error" @confirm="doActivate"
    />
    <ImpactDialog
      v-if="pkg" v-model="impact.open" :action="impact.action" :package-id="pkg.id" :name="pkg.name.es"
      :loading="impact.busy" :error="impact.error" @confirm="doImpact"
    />
  </div>
</template>

<style scoped>
.top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.min { min-width: 0; }
.title { font-size: 1.6rem; margin: 0 0 2px; overflow-wrap: anywhere; }
.ver { font-weight: 400; color: var(--ink-500); font-size: 1.1rem; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.tap { min-height: 44px; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.h { font-size: 1.15rem; margin: 22px 0 6px; }
.small { font-size: 0.9rem; margin: 0 0 8px; }
.desc { max-width: 70ch; }
.facts { display: grid; grid-template-columns: auto 1fr; gap: 6px 16px; margin: 0; }
.facts dt { color: var(--ink-500); }
.facts dd { margin: 0; overflow-wrap: anywhere; }
.plain { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--line); overflow-wrap: anywhere; }
.row a, .facts a, .tbl a { color: var(--rose-700); }
.scroll { overflow-x: auto; }
.tbl { border-collapse: collapse; width: 100%; font-size: 0.9rem; }
.tbl th, .tbl td { text-align: left; vertical-align: top; padding: 6px 12px 6px 0; border-bottom: 1px solid var(--line); }
.tbl thead th { font-weight: 600; white-space: nowrap; }
.tbl tbody th { font-weight: 400; }
.tbl code { white-space: nowrap; }
.tbl td { min-width: 90px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.review { display: grid; gap: 24px; grid-template-columns: minmax(0, 1fr); }
@media (min-width: 960px) { .review { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; } }
@media (max-width: 599px) { .actions, .actions .v-btn { width: 100%; } }
</style>
