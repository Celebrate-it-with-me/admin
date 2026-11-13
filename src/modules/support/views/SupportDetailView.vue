<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { API } from '@/services/axios'
import { useCurrentUserStore } from '@/store/currentUser'
import type { TeamMember } from '@/types'
import { supportService } from '../services/supportService'
import ImpersonateButton from '@/modules/impersonation/components/ImpersonateButton.vue'
import type { SupportDetail, SupportStatus } from '../types'
import { NOTE_MAX, STATUSES, contextRows, fullDate, noteValid, statusInfo, ageLabel } from '../utils'

const route = useRoute()
const me = useCurrentUserStore()

const item = ref<SupportDetail | null>(null)
const loading = ref(true)
const failed = ref(false)
const notFound = ref(false)

const load = async () => {
  loading.value = true
  failed.value = false
  notFound.value = false
  try { item.value = await supportService.show(route.params.id as string) } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    if (status === 404) notFound.value = true; else failed.value = true
  } finally { loading.value = false }
}

// Staff to assign to: the full team when the role may list it; otherwise only yourself.
const team = ref<TeamMember[]>([])
const canPickTeam = computed(() => me.can('admin.team.manage'))
onMounted(async () => {
  load()
  if (canPickTeam.value) { try { team.value = (await API.get('team')).data.data } catch { /* falls back to "asignarme" */ } }
})
watch(() => route.params.id, id => { if (id) load() })

const statusOptions = STATUSES.map(s => ({ title: statusInfo(s.value).label, value: s.value }))
const ctx = computed(() => contextRows(item.value?.context))
const staffOptions = computed(() => team.value.length ? team.value.map(m => ({ title: m.id === me.user.id ? `${m.name} (tú)` : m.name, value: m.id })) : [])

const saving = ref(false)
const saveError = ref('')
const status = computed(() => item.value ? statusInfo(item.value.status) : null)

const patch = async (body: { status?: SupportStatus; assignedTo?: number | null }) => {
  if (!item.value || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    const updated = await supportService.update(item.value.id, body)
    item.value = { ...updated, notes: updated.notes ?? item.value.notes }
  } catch (e) {
    const errors = (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors
    saveError.value = errors?.assignedTo ? 'Esa persona ya no puede recibir solicitudes.' : 'No pudimos guardar el cambio. Inténtalo de nuevo.'
  } finally { saving.value = false }
}
const assignMe = () => patch({ assignedTo: me.user.id ?? null })

// ── notes ──
const noteBody = ref('')
const noteTouched = ref(false)
const noteSaving = ref(false)
const noteError = ref('')
const noteOk = computed(() => noteValid(noteBody.value))
const addNote = async () => {
  noteTouched.value = true
  if (!item.value || !noteOk.value || noteSaving.value) return
  noteSaving.value = true
  noteError.value = ''
  try {
    const note = await supportService.addNote(item.value.id, noteBody.value.trim())
    item.value = { ...item.value, notes: [...item.value.notes, note] }
    noteBody.value = ''
    noteTouched.value = false
  } catch { noteError.value = 'No pudimos guardar la nota. Inténtalo de nuevo.' } finally { noteSaving.value = false }
}
</script>

<template>
  <section>
    <v-btn variant="text" :to="{ name: 'Support' }" prepend-icon="mdi-arrow-left" class="mb-2 back">Volver a la bandeja</v-btn>

    <v-skeleton-loader v-if="loading && !item" type="article, list-item-three-line" />

    <v-alert v-else-if="notFound" type="warning" variant="tonal" text="Esta solicitud no existe o ya no está disponible." />
    <v-alert v-else-if="failed" type="error" variant="tonal" text="No pudimos cargar la solicitud.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <template v-else-if="item && status">
      <header class="head">
        <div class="head__main">
          <div class="d-flex flex-wrap align-center ga-2 mb-2">
            <v-chip :color="status.color" variant="tonal" :prepend-icon="status.icon">{{ status.label }}</v-chip>
            <span class="text-body-2 text-medium-emphasis">Solicitud #{{ item.id }} · {{ fullDate(item.createdAt) }} ({{ ageLabel(item.createdAt) }})</span>
          </div>
          <h2 class="title">Mensaje de {{ item.user?.name ?? 'una cuenta eliminada' }}</h2>
        </div>
      </header>

      <v-row>
        <v-col cols="12" md="7">
          <v-card class="pa-4 mb-4">
            <h3 class="h3">Mensaje</h3>
            <p class="message">{{ item.message }}</p>
          </v-card>

          <v-card class="pa-4 mb-4">
            <h3 class="h3">Contexto</h3>
            <dl v-if="ctx.length" class="kv">
              <template v-for="row in ctx" :key="row.label"><dt>{{ row.label }}</dt><dd>{{ row.value }}</dd></template>
            </dl>
            <p v-else class="text-medium-emphasis">La solicitud no trae contexto.</p>
          </v-card>

          <v-card class="pa-4">
            <h3 class="h3">Notas internas</h3>
            <p class="text-body-2 text-medium-emphasis mb-3">Solo las ve el equipo. La usuaria no recibe nada de lo que escribas aquí.</p>
            <ol v-if="item.notes.length" class="notes" aria-live="polite">
              <li v-for="n in item.notes" :key="n.id" class="note">
                <p class="note__head"><strong>{{ n.author?.name ?? 'Equipo' }}</strong> <span class="text-medium-emphasis">· {{ fullDate(n.createdAt) }}</span></p>
                <p class="note__body">{{ n.body }}</p>
              </li>
            </ol>
            <p v-else class="text-medium-emphasis mb-3">Todavía no hay notas.</p>

            <form class="mt-3" @submit.prevent="addNote">
              <v-textarea
                v-model="noteBody" label="Agregar una nota" rows="3" auto-grow :counter="NOTE_MAX" :maxlength="NOTE_MAX"
                :error="noteTouched && !noteOk" :error-messages="noteTouched && !noteOk ? 'Escribe al menos 2 caracteres.' : ''" @blur="noteTouched = noteTouched || noteBody.length > 0"
              />
              <v-alert v-if="noteError" type="error" variant="tonal" density="compact" class="mb-3" :text="noteError" />
              <v-btn type="submit" color="primary" :loading="noteSaving" prepend-icon="mdi-note-plus-outline">Guardar nota</v-btn>
            </form>
          </v-card>
        </v-col>

        <v-col cols="12" md="5">
          <v-card class="pa-4 mb-4">
            <h3 class="h3">Gestión</h3>
            <v-select
              :model-value="item.status" :items="statusOptions"
              label="Estado" :disabled="saving" hide-details class="mb-4" @update:model-value="(v: SupportStatus) => patch({ status: v })"
            />
            <v-select
              v-if="canPickTeam && staffOptions.length"
              :model-value="item.assignedTo?.id ?? null" :items="staffOptions" label="Asignada a" clearable :disabled="saving" hide-details
              @update:model-value="(v: number | null) => patch({ assignedTo: v ?? null })"
            />
            <div v-else>
              <p class="text-body-2 mb-2"><span class="text-medium-emphasis">Asignada a:</span> <strong>{{ item.assignedTo ? item.assignedTo.name : 'Sin asignar' }}</strong></p>
              <v-btn v-if="item.assignedTo?.id !== me.user.id" variant="outlined" :disabled="saving" prepend-icon="mdi-account-arrow-left-outline" @click="assignMe">Asignarme a mí</v-btn>
              <v-btn v-else variant="text" :disabled="saving" prepend-icon="mdi-account-off-outline" @click="patch({ assignedTo: null })">Quitarme la asignación</v-btn>
            </div>
            <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-4" :text="saveError" role="alert" />
            <p v-if="item.resolvedAt" class="text-body-2 text-medium-emphasis mt-4">Resuelta el {{ fullDate(item.resolvedAt) }}.</p>
          </v-card>

          <v-card class="pa-4">
            <h3 class="h3">Quién y dónde</h3>
            <dl class="kv">
              <dt>Usuaria</dt>
              <dd v-if="item.user">
                <router-link :to="`/dashboard${item.user.adminPath}`">{{ item.user.name }}</router-link>
                <br><span class="text-body-2 text-medium-emphasis">{{ item.user.email }}</span>
                <ImpersonateButton :user="item.user" :support-request-id="item.id" size="compact" class="mt-3" />
              </dd>
              <dd v-else class="text-medium-emphasis">Cuenta eliminada</dd>
              <dt>Evento</dt>
              <dd v-if="item.event"><router-link :to="`/dashboard${item.event.adminPath}`">{{ item.event.name }}</router-link></dd>
              <dd v-else class="text-medium-emphasis">Sin evento</dd>
            </dl>
          </v-card>
        </v-col>
      </v-row>
    </template>
  </section>
</template>

<style scoped>
.back { margin-left: -12px; min-height: 44px; }
.head { margin-bottom: 20px; }
.title { font-size: 1.75rem; margin-bottom: 4px; overflow-wrap: anywhere; }
.h3 { font-size: 0.75rem; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px; font-family: var(--font-body); }
.message { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 1.0625rem; line-height: 1.6; margin: 0; }
.kv { display: grid; grid-template-columns: max-content 1fr; gap: 8px 16px; margin: 0; }
.kv dt { color: var(--ink-500); }
.kv dd { margin: 0; font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
.kv a { color: var(--rose-700); }
.notes { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.note { background: var(--cream-100); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
.note__head { font-size: 0.8125rem; margin: 0 0 4px; }
.note__body { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
