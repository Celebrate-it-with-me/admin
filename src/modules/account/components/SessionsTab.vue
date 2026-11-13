<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { closeOtherSessions, closeSession, fetchActivity, fetchSessions, logoutAll } from '../services/accountApi'
import { describeActivity, formatDateTime, parseApiError, sinceLabel } from '../logic'
import type { AccountSession, ActivityEntry } from '../types'
import ConfirmDialog from './ConfirmDialog.vue'

const emit = defineEmits<{ signedOut: [] }>()

const sessions = ref<AccountSession[]>([])
const sessionsLoading = ref(true)
const sessionsError = ref('')
const activity = ref<ActivityEntry[]>([])
const activityPage = ref(1)
const activityLast = ref(1)
const activityLoading = ref(true)
const activityError = ref('')

const toClose = ref<AccountSession | null>(null)
const closeOpen = ref(false)
const othersOpen = ref(false)
const allOpen = ref(false)
const working = ref(false)
const actionError = ref('')
const notice = ref('')

const others = computed(() => sessions.value.filter(s => !s.current))

const loadSessions = async () => {
  sessionsLoading.value = true; sessionsError.value = ''
  try { sessions.value = await fetchSessions() } catch (e) { sessionsError.value = parseApiError(e, 'No pudimos cargar tus sesiones.').message } finally { sessionsLoading.value = false }
}

const loadActivity = async (page = 1) => {
  activityLoading.value = true; activityError.value = ''
  try {
    const res = await fetchActivity(page)
    activity.value = page === 1 ? res.data : [...activity.value, ...res.data]
    activityPage.value = res.meta.page
    activityLast.value = res.meta.lastPage
  } catch (e) { activityError.value = parseApiError(e, 'No pudimos cargar tu historial.').message } finally { activityLoading.value = false }
}

const askClose = (s: AccountSession) => { toClose.value = s; actionError.value = ''; closeOpen.value = true }

const run = async (action: () => Promise<void>, done: string, dialog: { value: boolean }) => {
  working.value = true; actionError.value = ''
  try {
    await action()
    dialog.value = false
    notice.value = done
    await Promise.all([loadSessions(), loadActivity(1)])
  } catch (e) { actionError.value = parseApiError(e).message } finally { working.value = false }
}

const confirmClose = () => run(async () => { await closeSession(toClose.value!.id) }, 'Cerramos esa sesión.', closeOpen)
const confirmOthers = () => run(async () => { await closeOtherSessions() }, 'Cerramos las demás sesiones.', othersOpen)

const confirmAll = async () => {
  working.value = true; actionError.value = ''
  try {
    await logoutAll()
    allOpen.value = false
    emit('signedOut')
  } catch (e) { actionError.value = parseApiError(e).message } finally { working.value = false }
}

const iconFor = (s: AccountSession) => (/Android|iOS/.test(s.device) ? 'mdi-cellphone' : 'mdi-laptop')

onMounted(() => { void loadSessions(); void loadActivity(1) })
</script>

<template>
  <div class="stack">
    <v-card class="pa-2">
      <v-card-title class="card-title d-flex align-center flex-wrap ga-2">
        Sesiones activas
        <v-spacer />
        <v-btn v-if="others.length" size="small" variant="tonal" class="touch" prepend-icon="mdi-logout-variant" @click="actionError = ''; othersOpen = true">Cerrar las demás</v-btn>
      </v-card-title>
      <v-card-text>
        <p class="text-medium-emphasis mb-4">Los dispositivos donde tu cuenta tiene la sesión abierta. Si ves uno que no reconoces, ciérralo y cambia tu contraseña.</p>
        <div aria-live="polite">
          <v-alert v-if="notice" type="success" variant="tonal" density="compact" class="mb-3" closable :text="notice" @click:close="notice = ''" />
        </div>

        <v-skeleton-loader v-if="sessionsLoading && !sessions.length" type="list-item-two-line, list-item-two-line" />
        <v-alert v-else-if="sessionsError" type="error" variant="tonal" density="compact">
          {{ sessionsError }}
          <template #append><v-btn size="small" variant="text" class="touch" @click="loadSessions">Reintentar</v-btn></template>
        </v-alert>
        <ul v-else class="sessions" :class="{ dim: sessionsLoading }" aria-label="Sesiones activas">
          <li v-for="s in sessions" :key="s.id" class="session">
            <v-icon :icon="iconFor(s)" size="28" class="session__icon" />
            <div class="session__body">
              <p class="session__title">
                {{ s.device }}
                <v-chip v-if="s.current" size="x-small" color="success" variant="tonal" class="ml-1">Esta sesión</v-chip>
                <v-chip v-else-if="s.client !== 'admin'" size="x-small" variant="tonal" class="ml-1" title="Sesión de la app de organizadoras o anterior al registro de dispositivos">Otra app</v-chip>
              </p>
              <p class="session__meta">
                Último uso: {{ s.current ? 'ahora' : sinceLabel(s.lastUsedAt) }}
                <template v-if="s.ip"> · Red {{ s.ip }}</template>
                · Inició {{ formatDateTime(s.createdAt) }}
              </p>
            </div>
            <v-btn v-if="!s.current" size="small" variant="text" color="error" class="touch" :aria-label="`Cerrar la sesión de ${s.device}`" @click="askClose(s)">Cerrar</v-btn>
          </li>
          <li v-if="!sessions.length" class="text-medium-emphasis">No hay sesiones activas.</li>
        </ul>

        <v-divider class="my-4" />
        <v-btn variant="tonal" color="error" class="touch" prepend-icon="mdi-logout" @click="actionError = ''; allOpen = true">Cerrar sesión en todos lados</v-btn>
      </v-card-text>
    </v-card>

    <v-card class="pa-2">
      <v-card-title class="card-title">Actividad reciente</v-card-title>
      <v-card-text>
        <p class="text-medium-emphasis mb-4">Tus inicios de sesión y cambios de seguridad. Solo ves lo tuyo; la dirección de red se muestra abreviada.</p>
        <v-skeleton-loader v-if="activityLoading && !activity.length" type="list-item-two-line, list-item-two-line, list-item-two-line" />
        <v-alert v-else-if="activityError" type="error" variant="tonal" density="compact">
          {{ activityError }}
          <template #append><v-btn size="small" variant="text" class="touch" @click="loadActivity(1)">Reintentar</v-btn></template>
        </v-alert>
        <p v-else-if="!activity.length" class="text-medium-emphasis">Todavía no hay actividad.</p>
        <ol v-else class="activity" :class="{ dim: activityLoading }">
          <li v-for="entry in activity" :key="entry.id" class="activity__item">
            <v-icon :icon="describeActivity(entry).icon" :color="describeActivity(entry).tone" size="20" />
            <div>
              <p class="activity__title">{{ describeActivity(entry).label }}<span v-if="describeActivity(entry).note" class="text-medium-emphasis"> · {{ describeActivity(entry).note }}</span></p>
              <p class="session__meta">{{ formatDateTime(entry.createdAt) }} · {{ entry.device }}<template v-if="entry.ip"> · Red {{ entry.ip }}</template></p>
            </div>
          </li>
        </ol>
        <v-btn v-if="activityPage < activityLast" variant="text" class="touch mt-2" :loading="activityLoading" @click="loadActivity(activityPage + 1)">Ver más</v-btn>
      </v-card-text>
    </v-card>

    <confirm-dialog
      v-model="closeOpen" title="Cerrar esta sesión" confirm-label="Cerrar sesión" danger :loading="working" :error="actionError"
      :message="`Cerraremos la sesión de ${toClose?.device ?? 'ese dispositivo'}. Tendrá que volver a entrar.`" @confirm="confirmClose"
    />
    <confirm-dialog
      v-model="othersOpen" title="Cerrar las demás sesiones" confirm-label="Cerrar las demás" danger :loading="working" :error="actionError"
      message="Todos tus otros dispositivos tendrán que volver a entrar. Esta sesión sigue abierta." @confirm="confirmOthers"
    />
    <confirm-dialog
      v-model="allOpen" title="Cerrar sesión en todos lados" confirm-label="Cerrar todo" danger :loading="working" :error="actionError"
      message="Cerraremos tu sesión en todos los dispositivos, incluido este. Tendrás que entrar de nuevo." @confirm="confirmAll"
    />
  </div>
</template>

<style scoped>
.stack { display: grid; gap: 16px; max-width: 720px; }
.card-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.sessions, .activity { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; transition: opacity 0.15s ease-out; }
.dim { opacity: 0.55; }
.session { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.session:last-child { border-bottom: 0; }
.session__icon { color: var(--ink-500); flex: none; }
.session__body { flex: 1; min-width: 0; }
.session__title { font-weight: 600; margin: 0; overflow-wrap: anywhere; }
.session__meta { font-size: 0.8125rem; color: var(--ink-500); margin: 2px 0 0; overflow-wrap: anywhere; }
.activity__item { display: flex; gap: 12px; align-items: flex-start; padding: 8px 0; }
.activity__title { margin: 0; overflow-wrap: anywhere; }
.touch { min-height: 44px; }
</style>
