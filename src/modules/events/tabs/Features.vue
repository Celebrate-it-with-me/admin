<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ReasonDialog from '@/components/ReasonDialog.vue'
import OverrideDialog from '../features/OverrideDialog.vue'
import { explainError, fetchEventModules, removeModuleOverride, setModuleOverride } from '../features/featuresApi'
import { expiryLabel, groupBySection, sectionLabel, SOURCE_LABEL, type EventModuleRow, type EventModulesData, type ModuleState } from '../features/logic'
import { moduleLabel } from '../labels'
import { whenLabel } from '@/composables/useAuditLabels'
import type { EventDetail } from '../types'

// Receives the loaded event; emits `reload` after a change so the sheet refreshes.
const props = defineProps<{ detail: EventDetail }>()
const emit = defineEmits<{ reload: [] }>()

const me = useCurrentUserStore()
const canGift = computed(() => me.can('admin.modules.gift'))
const eventId = computed(() => props.detail.event.id)

const data = ref<EventModulesData | null>(null)
const loading = ref(true)
const failed = ref(false)
const notice = ref('')

const load = async () => {
  loading.value = true
  failed.value = false
  try { data.value = await fetchEventModules(eventId.value) } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const groups = computed(() => groupBySection(data.value?.modules ?? []))
const empty = computed(() => !loading.value && !failed.value && !(data.value?.modules.length))

// ── change ──
const target = ref<EventModuleRow | null>(null)
const mode = ref<'active' | 'locked' | 'remove' | null>(null)
const busy = ref(false)
const error = ref('')

const open = (row: EventModuleRow, m: 'active' | 'locked' | 'remove') => { target.value = row; mode.value = m; error.value = '' }
const close = () => { mode.value = null }

const done = async (text: string, next: EventModulesData) => {
  data.value = next
  close()
  notice.value = text
  emit('reload')
}

const save = async (v: { expiresAt: string | null; reason: string }) => {
  if (!target.value || (mode.value !== 'active' && mode.value !== 'locked')) return
  busy.value = true
  error.value = ''
  const state: ModuleState = mode.value
  try {
    const next = await setModuleOverride(eventId.value, target.value.key, { state, expiresAt: v.expiresAt, reason: v.reason })
    await done(`${moduleLabel(target.value.key)}: ${state === 'active' ? 'regalado' : 'bloqueado'}.`, next)
  } catch (e) { error.value = explainError(e) } finally { busy.value = false }
}

const remove = async (reason: string) => {
  if (!target.value) return
  busy.value = true
  error.value = ''
  try {
    await done(`${moduleLabel(target.value.key)}: volvió a lo que dice el plan.`, await removeModuleOverride(eventId.value, target.value.key, reason))
  } catch (e) { error.value = explainError(e) } finally { busy.value = false }
}

const dialogOpen = computed({
  get: () => mode.value === 'active' || mode.value === 'locked',
  set: v => { if (!v) close() },
})
const removeOpen = computed({ get: () => mode.value === 'remove', set: v => { if (!v) close() } })
</script>

<template>
  <div>
    <p class="sr-only" aria-live="polite">{{ notice }}</p>

    <div v-if="loading && !data" class="skeleton" aria-busy="true">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" />
    </div>

    <v-card v-else-if="failed && !data" class="pa-6 text-center">
      <p class="mb-3">No pudimos cargar las funciones del evento.</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <v-card v-else-if="empty" class="pa-6 text-center">
      <p class="text-medium-emphasis">El catálogo no tiene módulos activos.</p>
    </v-card>

    <div v-else-if="data" :class="{ dim: loading }">
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mb-3">
        No pudimos actualizar.
        <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>
      <v-alert v-if="notice" type="success" variant="tonal" density="compact" closable class="mb-3" @click:close="notice = ''">{{ notice }}</v-alert>

      <div class="counters mb-4">
        <v-chip color="success" variant="tonal" prepend-icon="mdi-gift-outline">Regalos activos: {{ data.giftsActive }}</v-chip>
        <v-chip v-if="data.blockedActive" color="error" variant="tonal" prepend-icon="mdi-lock-outline">Bloqueos a mano: {{ data.blockedActive }}</v-chip>
        <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="loading" @click="load">Actualizar</v-btn>
      </div>

      <v-card v-for="g in groups" :key="g.section" class="mb-4 group">
        <h3 class="text-h6 px-5 pt-4 pb-2">{{ sectionLabel(g.section) }}</h3>
        <div class="table-wrap">
          <table class="modules">
            <thead>
              <tr>
                <th scope="col">Módulo</th>
                <th scope="col">Estado</th>
                <th scope="col">Origen</th>
                <th v-if="canGift" scope="col" class="actions-col"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in g.rows" :key="row.key">
                <th scope="row" class="name">{{ moduleLabel(row.key) }}</th>
                <td>
                  <v-chip size="small" variant="tonal" :color="row.effectiveState === 'active' ? 'success' : 'secondary'" :prepend-icon="row.effectiveState === 'active' ? 'mdi-check-circle-outline' : 'mdi-lock-outline'">
                    {{ row.effectiveState === 'active' ? 'Activo' : 'Bloqueado' }}
                  </v-chip>
                </td>
                <td>
                  <span :class="{ strong: row.source !== 'plan' }">{{ SOURCE_LABEL[row.source] }}</span>
                  <template v-if="row.override">
                    <span class="text-caption text-medium-emphasis d-block">{{ expiryLabel(row.override) }}</span>
                    <span class="text-caption text-medium-emphasis d-block">
                      {{ row.override.createdBy?.name ?? 'Equipo' }}<template v-if="row.override.createdAt"> · {{ whenLabel(row.override.createdAt, true) }}</template>
                    </span>
                    <span class="text-caption text-medium-emphasis d-block reason">Motivo: {{ row.override.reason }}</span>
                  </template>
                </td>
                <td v-if="canGift" class="actions-col">
                  <div class="actions">
                    <v-btn v-if="row.effectiveState === 'locked' && row.source !== 'blocked'" size="small" variant="tonal" color="primary" prepend-icon="mdi-gift-outline" @click="open(row, 'active')">Regalar</v-btn>
                    <v-btn v-if="row.effectiveState === 'active' && row.source !== 'gift'" size="small" variant="tonal" color="error" prepend-icon="mdi-lock-outline" @click="open(row, 'locked')">Bloquear</v-btn>
                    <v-btn v-if="row.override" size="small" variant="text" prepend-icon="mdi-undo" @click="open(row, 'remove')">Quitar excepción</v-btn>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>
      <p v-if="!canGift" class="text-caption text-medium-emphasis">Tu rol puede ver las funciones pero no cambiarlas.</p>
    </div>

    <OverrideDialog
      v-if="target"
      v-model="dialogOpen"
      :module-key="target.key"
      :mode="mode === 'locked' ? 'locked' : 'active'"
      :loading="busy"
      :error="error"
      @confirm="save"
    />
    <ReasonDialog
      v-model="removeOpen"
      :title="`Quitar la excepción de ${target ? moduleLabel(target.key) : ''}`"
      message="El módulo volverá a lo que dice el plan del evento."
      confirm-label="Quitar excepción"
      :loading="busy"
      :error="error"
      @confirm="remove"
    />
  </div>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.counters { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.table-wrap { overflow-x: auto; }
.modules { width: 100%; border-collapse: collapse; }
.modules th, .modules td { padding: 12px 20px; text-align: left; vertical-align: top; border-top: 1px solid var(--line); }
.modules thead th { font-size: 0.75rem; font-weight: 600; color: rgba(var(--v-theme-on-surface), 0.6); border-top: 0; }
.modules .name { font-weight: 500; }
.strong { font-weight: 600; }
.reason { max-width: 32ch; overflow-wrap: anywhere; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.actions :deep(.v-btn) { min-height: 44px; }

@media (max-width: 700px) {
  .modules, .modules tbody, .modules tr, .modules th, .modules td { display: block; }
  .modules thead { position: absolute; left: -9999px; }
  .modules tr { padding: 12px 16px; border-top: 1px solid var(--line); }
  .modules th, .modules td { padding: 2px 0; border: 0; }
  .actions { justify-content: flex-start; margin-top: 8px; }
  .actions-col { padding-top: 4px; }
}
</style>
