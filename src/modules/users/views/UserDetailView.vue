<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { API } from '@/services/axios'
import { useCurrentUserStore } from '@/store/currentUser'
import { ROLE_LABELS } from '@/composables/useAuditLabels'
import { formatMoney } from '@/composables/useMoney'
import ReasonDialog from '@/components/ReasonDialog.vue'
import UserFormDialog from '../components/UserFormDialog.vue'
import DeleteUserDialog from '../components/DeleteUserDialog.vue'
import ImpersonateButton from '@/modules/impersonation/components/ImpersonateButton.vue'
import { EVENT_STATUS, ROLE_IN_EVENT, dateLabel, explainError, filenameFrom, initials } from '../helpers'
import type { UserProfile } from '../types'

const route = useRoute()
const me = useCurrentUserStore()
const id = computed(() => Number(route.params.id))

const user = ref<UserProfile | null>(null)
const loading = ref(true)
const failed = ref<'missing' | 'error' | null>(null)

const load = async () => {
  loading.value = true
  failed.value = null
  try { user.value = (await API.get(`users/${id.value}`)).data.data }
  catch (e) { failed.value = (e as { response?: { status?: number } })?.response?.status === 404 ? 'missing' : 'error' }
  finally { loading.value = false }
}
onMounted(load)
watch(id, load)

const isStaff = computed(() => !!user.value?.staffRoles.length)
const deleted = computed(() => !!user.value?.anonymizedAt)
const notice = ref<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)

// ── password reset ──
const resetting = ref(false)
const reset = async () => {
  resetting.value = true
  notice.value = null
  try {
    await API.post(`users/${id.value}/password-reset`)
    notice.value = { type: 'success', text: `Enviamos el correo para restablecer la contraseña a ${user.value?.email}.` }
  } catch (e) { notice.value = { type: 'error', text: explainError(e) } } finally { resetting.value = false }
}

// ── suspend / unsuspend ──
const suspendMode = ref<'suspend' | 'unsuspend' | null>(null)
const suspendLoading = ref(false)
const suspendError = ref('')
const askSuspend = (mode: 'suspend' | 'unsuspend') => { suspendMode.value = mode; suspendError.value = '' }
const doSuspend = async (reason: string) => {
  if (!suspendMode.value) return
  suspendLoading.value = true
  suspendError.value = ''
  try {
    const res = await API.post(`users/${id.value}/${suspendMode.value}`, { reason })
    user.value = res.data.data
    notice.value = { type: 'success', text: suspendMode.value === 'suspend' ? 'Cuenta suspendida. No podrá entrar; sus eventos publicados siguen visibles.' : 'Cuenta reactivada. Ya puede entrar de nuevo.' }
    suspendMode.value = null
  } catch (e) { suspendError.value = explainError(e) } finally { suspendLoading.value = false }
}

// ── export ──
const exporting = ref(false)
const exportData = async () => {
  exporting.value = true
  notice.value = null
  try {
    const res = await API.get(`users/${id.value}/export`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filenameFrom(res.headers['content-disposition'], `user-${id.value}-export.json`)
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) { notice.value = { type: 'error', text: explainError(e, 'No pudimos exportar los datos.') } } finally { exporting.value = false }
}

// ── edit / delete ──
const editOpen = ref(false)
const deleteOpen = ref(false)
const onDeleted = async (archived: number[]) => {
  deleteOpen.value = false
  notice.value = { type: 'success', text: archived.length ? `Cuenta anonimizada. ${archived.length} evento(s) pasaron a archivados.` : 'Cuenta anonimizada.' }
  await load()
}
const onSaved = async () => { editOpen.value = false; await load() }
</script>

<template>
  <section>
    <v-btn variant="text" prepend-icon="mdi-arrow-left" class="back" to="/dashboard/users">Usuarios</v-btn>

    <v-skeleton-loader v-if="loading && !user" type="heading, article, article" />
    <v-alert v-else-if="failed === 'missing'" type="warning" variant="tonal" text="Esa cuenta no existe." />
    <v-alert v-else-if="failed" type="error" variant="tonal" text="No pudimos cargar la cuenta.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <template v-else-if="user">
      <header class="head">
        <v-avatar size="64" color="secondary" variant="tonal" class="head__avatar">
          <v-img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name" />
          <span v-else>{{ initials(user.name) }}</span>
        </v-avatar>
        <div class="head__text">
          <h2 class="title">{{ user.name }}</h2>
          <p class="mail">{{ user.email }}<span v-if="user.phone"> · {{ user.phone }}</span></p>
          <div class="chips">
            <v-chip v-if="user.suspension" color="error" variant="tonal" size="small" prepend-icon="mdi-cancel">Suspendida</v-chip>
            <v-chip v-else-if="deleted" variant="tonal" size="small">Borrada (anonimizada)</v-chip>
            <v-chip v-else color="success" variant="tonal" size="small">Activa</v-chip>
            <v-chip v-for="r in user.staffRoles" :key="r" color="primary" variant="tonal" size="small">{{ ROLE_LABELS[r] }}</v-chip>
            <v-chip v-if="!deleted" :color="user.emailVerified ? 'success' : 'warning'" variant="outlined" size="small">{{ user.emailVerified ? 'Correo verificado' : 'Correo sin verificar' }}</v-chip>
          </div>
        </div>
      </header>

      <div aria-live="polite">
        <v-alert v-if="notice" :type="notice.type" variant="tonal" class="mb-4" closable :text="notice.text" @click:close="notice = null" />
      </div>

      <v-alert v-if="user.suspension" type="error" variant="tonal" class="mb-4" icon="mdi-cancel">
        <strong>Cuenta suspendida</strong> el {{ dateLabel(user.suspension.at, true) }}<span v-if="user.suspension.by"> por {{ user.suspension.by.name }}</span>.
        <p v-if="user.suspension.reason" class="mt-1 mb-0">Motivo: {{ user.suspension.reason }}</p>
      </v-alert>

      <v-row>
        <v-col cols="12" lg="8">
          <v-card class="pa-4 mb-4">
            <h3 class="h3">Datos</h3>
            <dl class="kv">
              <dt>Nombre</dt><dd>{{ user.name }}</dd>
              <dt>Correo</dt><dd>{{ user.email }}</dd>
              <dt>Teléfono</dt><dd>{{ user.phone || '—' }}</dd>
              <dt>Alta</dt><dd>{{ dateLabel(user.createdAt, true) }}</dd>
              <template v-if="user.anonymizedAt"><dt>Anonimizada</dt><dd>{{ dateLabel(user.anonymizedAt, true) }}</dd></template>
            </dl>
          </v-card>

          <v-card class="pa-4 mb-4">
            <h3 class="h3">Eventos ({{ user.events.length }})</h3>
            <p v-if="!user.events.length" class="text-medium-emphasis mb-0">No participa en ningún evento.</p>
            <ul v-else class="list">
              <li v-for="ev in user.events" :key="ev.id" class="list__row">
                <div class="list__main">
                  <router-link :to="`/dashboard/events/${ev.id}`" class="link"><strong>{{ ev.name }}</strong></router-link>
                  <span class="text-caption text-medium-emphasis">{{ ROLE_IN_EVENT[ev.role] ?? ev.role }}<span v-if="ev.plan"> · plan {{ ev.plan }}</span></span>
                </div>
                <v-chip size="small" variant="tonal" :color="ev.published ? 'success' : undefined">{{ ev.published ? 'Publicado' : (EVENT_STATUS[ev.status ?? ''] ?? ev.status ?? 'Borrador') }}</v-chip>
              </li>
            </ul>
          </v-card>

          <v-card class="pa-4">
            <h3 class="h3">Sesiones recientes</h3>
            <p v-if="!user.recentSessions.length" class="text-medium-emphasis mb-0">Sin sesiones registradas.</p>
            <ul v-else class="list">
              <li v-for="(s, i) in user.recentSessions" :key="i" class="list__row">
                <div class="list__main">
                  <strong>{{ dateLabel(s.loginTime, true) }}</strong>
                  <span class="text-caption text-medium-emphasis">{{ [s.browser, s.device, s.location].filter(Boolean).join(' · ') || '—' }}<span v-if="s.ip"> · IP {{ s.ip }}</span></span>
                </div>
                <span v-if="s.logoutTime" class="text-caption text-medium-emphasis nowrap">Salió {{ dateLabel(s.logoutTime, true) }}</span>
              </li>
            </ul>
          </v-card>
        </v-col>

        <v-col cols="12" lg="4">
          <v-card class="pa-4 mb-4">
            <h3 class="h3">Compras</h3>
            <dl class="kv">
              <dt>Pagadas</dt><dd>{{ user.purchases.paidCount }}</dd>
              <dt>Total pagado</dt><dd>{{ formatMoney(user.purchases.paidTotalCents, user.purchases.currency) }}</dd>
              <dt>Reembolsadas</dt><dd>{{ user.purchases.refundedCount }}</dd>
            </dl>
          </v-card>

          <v-card class="pa-4">
            <h3 class="h3">Acciones</h3>
            <div class="actions">
              <ImpersonateButton v-if="!deleted && !isStaff && !user.suspension" :user="user" />
              <v-btn v-if="me.can('admin.users.reset_password')" variant="outlined" prepend-icon="mdi-lock-reset" :loading="resetting" :disabled="deleted" @click="reset">Restablecer contraseña</v-btn>
              <template v-if="!deleted">
                <v-btn v-if="me.can('admin.users.suspend') && !user.suspension && !isStaff" variant="outlined" color="warning" prepend-icon="mdi-cancel" @click="askSuspend('suspend')">Suspender</v-btn>
                <v-btn v-if="me.can('admin.users.suspend') && user.suspension" variant="outlined" color="success" prepend-icon="mdi-account-check-outline" @click="askSuspend('unsuspend')">Reactivar</v-btn>
              </template>
              <v-btn v-if="me.can('admin.users.export')" variant="outlined" prepend-icon="mdi-download-outline" :loading="exporting" @click="exportData">Exportar datos (JSON)</v-btn>
              <v-btn v-if="me.can('admin.users.manage') && !deleted" variant="outlined" prepend-icon="mdi-pencil-outline" @click="editOpen = true">Editar datos</v-btn>
              <v-btn v-if="me.can('admin.users.delete') && !deleted && !isStaff" variant="flat" color="error" prepend-icon="mdi-account-remove-outline" @click="deleteOpen = true">Borrar cuenta</v-btn>
            </div>
            <p v-if="isStaff" class="text-caption text-medium-emphasis mt-3 mb-0">Es una cuenta del equipo: no se suspende ni se borra desde aquí. Quítale el acceso en "Equipo y roles".</p>
          </v-card>
        </v-col>
      </v-row>

      <ReasonDialog
        :model-value="suspendMode !== null"
        :title="suspendMode === 'suspend' ? 'Suspender la cuenta' : 'Reactivar la cuenta'"
        :message="suspendMode === 'suspend'
          ? `${user.name} no podrá entrar y se cerrarán sus sesiones. Sus eventos publicados siguen visibles para los invitados. Al intentar entrar verá un aviso para escribir a soporte.`
          : `${user.name} podrá volver a entrar.`"
        :confirm-label="suspendMode === 'suspend' ? 'Suspender' : 'Reactivar'"
        :danger="suspendMode === 'suspend'"
        :loading="suspendLoading" :error="suspendError"
        @update:model-value="suspendMode = null" @confirm="doSuspend"
      />
      <UserFormDialog v-model="editOpen" :user="user" @saved="onSaved" />
      <DeleteUserDialog v-model="deleteOpen" :user="user" @deleted="onDeleted" />
    </template>
  </section>
</template>

<style scoped>
.back { margin: 0 0 8px -12px; min-height: 44px; }
.head { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
.head__avatar { flex: none; font-weight: 700; }
.head__text { min-width: 0; }
.title { font-size: 2rem; margin: 0 0 2px; overflow-wrap: anywhere; }
.mail { margin: 0 0 8px; color: var(--ink-500); overflow-wrap: anywhere; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.h3 { font-size: 1.25rem; margin-bottom: 12px; }
.kv { display: grid; grid-template-columns: max-content 1fr; gap: 8px 20px; margin: 0; }
.kv dt { color: var(--ink-500); }
.kv dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.list { list-style: none; margin: 0; padding: 0; }
.list__row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); }
.list__row:first-child { border-top: 0; }
.list__main { display: flex; flex-direction: column; min-width: 0; overflow-wrap: anywhere; }
.link { color: var(--rose-700); text-decoration: none; }
.link:hover, .link:focus-visible { text-decoration: underline; }
.actions { display: flex; flex-direction: column; gap: 10px; }
.actions .v-btn { min-height: 44px; justify-content: flex-start; }
.nowrap { white-space: nowrap; }
@media (max-width: 599px) { .title { font-size: 1.5rem; } .list__row { flex-wrap: wrap; } }
</style>
