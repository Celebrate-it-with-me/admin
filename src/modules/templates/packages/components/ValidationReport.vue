<script setup lang="ts">
import { computed } from 'vue'
import CreditsTable from './CreditsTable.vue'
import ThirdPartyMarksBanner from './ThirdPartyMarksBanner.vue'
import { codeHelp, formatBytes, groupReport, hasMarkWarning, reportCounts } from '../logic'
import type { ReportItem, ValidationReport } from '../types'

/** The validation report of an uploaded zip: counts, then errors (red) and warnings (amber) grouped by file. */
const props = defineProps<{ report: ValidationReport }>()

const groups = computed(() => groupReport(props.report))
const counts = computed(() => reportCounts(props.report))
const marksWarning = computed(() => props.report.warnings.find(w => w.code === 'third_party_marks_declared') ?? null)
const marks = computed(() => props.report.manifest?.thirdPartyMarks ?? [])
const credits = computed(() => props.report.manifest?.assetsCredits ?? [])
const license = computed(() => props.report.manifest?.license ?? null)
const showMarks = computed(() => marks.value.length > 0 || hasMarkWarning(props.report))

const budget = (bytes: number, limit: number) => (bytes > limit ? 'over' : '')
const place = (item: ReportItem) => (item.line ? `línea ${item.line}` : '')
</script>

<template>
  <div class="report" data-testid="report">
    <div class="summary" role="status">
      <v-chip v-if="counts.errors === 0" color="success" variant="tonal" prepend-icon="mdi-check-circle-outline">Sin errores</v-chip>
      <v-chip v-else color="error" variant="tonal" prepend-icon="mdi-close-circle-outline">{{ counts.errors === 1 ? '1 error' : `${counts.errors} errores` }}</v-chip>
      <v-chip :color="counts.warnings ? 'warning' : undefined" variant="tonal" prepend-icon="mdi-alert-outline">
        {{ counts.warnings === 0 ? 'Sin avisos' : counts.warnings === 1 ? '1 aviso' : `${counts.warnings} avisos` }}
      </v-chip>
    </div>
    <p v-if="counts.errors" class="text-medium-emphasis mt-2 mb-0">Los errores impiden instalar el paquete. Corrígelos, vuelve a empaquetar y sube el .zip otra vez. Los avisos no bloquean.</p>

    <dl v-if="report.stats" class="stats">
      <div><dt>Archivos</dt><dd>{{ report.stats.files }}</dd></div>
      <div><dt>Descomprimido</dt><dd>{{ formatBytes(report.stats.uncompressedBytes) }}</dd></div>
      <div><dt>Peso al abrir la invitación</dt><dd :class="budget(report.stats.runtimeBytes, 350 * 1024)">{{ formatBytes(report.stats.runtimeBytes) }} <small>de 350 KB</small></dd></div>
      <div><dt>Primer pliegue</dt><dd :class="budget(report.stats.firstFoldBytes, 180 * 1024)">{{ formatBytes(report.stats.firstFoldBytes) }} <small>de 180 KB</small></dd></div>
    </dl>

    <ThirdPartyMarksBanner v-if="showMarks" class="mt-4" :marks="marks" :note="marksWarning?.detail ?? marksWarning?.message" />

    <section v-if="report.manifest" class="mt-5" aria-labelledby="rep-credits">
      <h4 id="rep-credits" class="file-name">Licencia y créditos de los assets</h4>
      <p v-if="license" class="mb-2"><strong>{{ license.id }}</strong><span class="text-medium-emphasis"> · {{ license.summary }}</span></p>
      <CreditsTable :credits="credits" />
    </section>

    <p v-if="groups.length === 0" class="empty mt-4"><v-icon icon="mdi-check-all" color="success" /> El paquete no tiene errores ni avisos.</p>

    <section v-for="g in groups" :key="g.file ?? '__general'" class="file" :data-file="g.file ?? 'general'" :aria-label="`Problemas de ${g.label}`">
      <h4 class="file-name"><v-icon icon="mdi-file-outline" size="18" class="mr-1" /><code v-if="g.file">{{ g.label }}</code><span v-else>{{ g.label }}</span></h4>
      <ul class="items">
        <li v-for="(e, i) in g.errors" :key="`e${i}`" class="item error" data-severity="error">
          <v-icon icon="mdi-close-circle-outline" color="error" size="20" aria-label="Error" />
          <div class="body">
            <div class="head"><code class="code">{{ e.code }}</code><span v-if="place(e)" class="where">{{ place(e) }}</span></div>
            <p class="msg">{{ e.message }}</p>
            <p v-if="codeHelp(e.code)" class="help">{{ codeHelp(e.code) }}</p>
            <pre v-if="e.detail" class="detail">{{ e.detail }}</pre>
          </div>
        </li>
        <li v-for="(w, i) in g.warnings" :key="`w${i}`" class="item warning" data-severity="warning">
          <v-icon icon="mdi-alert-outline" color="warning" size="20" aria-label="Aviso" />
          <div class="body">
            <div class="head"><code class="code">{{ w.code }}</code><span v-if="place(w)" class="where">{{ place(w) }}</span></div>
            <p class="msg">{{ w.message }}</p>
            <p v-if="codeHelp(w.code)" class="help">{{ codeHelp(w.code) }}</p>
            <pre v-if="w.detail" class="detail">{{ w.detail }}</pre>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.summary { display: flex; flex-wrap: wrap; gap: 8px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin: 16px 0 0; }
.stats dt { color: var(--ink-500); font-size: 0.85rem; }
.stats dd { margin: 0; font-weight: 600; }
.stats dd.over { color: #8a5a00; }
.stats small { font-weight: 400; color: var(--ink-500); }
.empty { display: flex; align-items: center; gap: 8px; }
.file { margin-top: 18px; }
.file-name { font-size: 1rem; margin: 0 0 6px; display: flex; align-items: center; overflow-wrap: anywhere; }
.items { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.item { display: flex; gap: 10px; padding: 10px 12px; border-radius: 8px; border-left: 4px solid; }
.item.error { background: rgba(176, 0, 32, 0.06); border-color: #b00020; }
.item.warning { background: rgba(251, 140, 0, 0.09); border-color: #c77700; }
.body { min-width: 0; flex: 1; }
.head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; }
.code { font-size: 0.85rem; font-weight: 600; }
.where { color: var(--ink-500); font-size: 0.85rem; }
.msg { margin: 2px 0 0; overflow-wrap: anywhere; }
.help { margin: 2px 0 0; color: var(--ink-500); font-size: 0.9rem; }
.detail { margin: 6px 0 0; padding: 6px 8px; background: rgba(0, 0, 0, 0.05); border-radius: 6px; font-size: 0.8rem; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
