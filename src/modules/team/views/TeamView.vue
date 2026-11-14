<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { useCurrentUserStore } from '@/store/currentUser'
import type { StaffRole } from '@/types'
import { ROLE_LABELS } from '@/composables/useAuditLabels'
import ReasonDialog from '@/components/ReasonDialog.vue'
import InviteDialog from '../components/InviteDialog.vue'
import MemberActions from '../components/MemberActions.vue'
import MemberStatus from '../components/MemberStatus.vue'
import RoleField from '../components/RoleField.vue'
import { changeRole, listTeam, reactivateMember, removeMember, resendInvitation, resetTwoFactor, revokeInvitation, suspendMember } from '../services/teamApi'
import { actionsFor, countByStatus, expiryLabel, filterMembers, hasFilters, isSelf, lastLoginLabel, parseTeamError, STATUS_LABELS } from '../logic'
import type { ActionKey, InviteResult, Member, TeamFilters } from '../types'

const me = useCurrentUserStore()
const { smAndDown } = useDisplay()

const members = ref<Member[]>([])
const loading = ref(true)
const failed = ref(false)
const filters = ref<TeamFilters>({ search: '', status: null, role: null })
const notice = ref<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const list = await listTeam()
    if (request === latest) members.value = list
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)

const visible = computed(() => filterMembers(members.value, filters.value))
const counts = computed(() => countByStatus(members.value))
const filtered = computed(() => hasFilters(filters.value))
const clearFilters = () => { filters.value = { search: '', status: null, role: null } }
const actionsOf = (m: Member) => actionsFor(m, members.value, me.user)
const self = (m: Member) => isSelf(m, me.user)

const STATUS_ITEMS = (['active', 'invited', 'suspended'] as const).map(value => ({ value, title: STATUS_LABELS[value] }))
const ROLE_ITEMS = (['superadmin', 'support'] as const).map(value => ({ value, title: ROLE_LABELS[value] }))

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

// ── invite ──
const inviteOpen = ref(false)
/** The mail can fail (SMTP) while the invitation exists: a warning, not an error, and the list shows it. */
const MAIL_FAILED = 'No pudimos enviar el correo; usa Reenviar.'
const onInvited = async ({ member: m, mailSent }: InviteResult) => {
  notice.value = mailSent
    ? { type: 'success', text: `Enviamos la invitación a ${m.email}. ${capitalize(expiryLabel(m.invitation?.expiresAt))}.` }
    : { type: 'warning', text: `Creamos la invitación para ${m.email}. ${MAIL_FAILED}` }
  await load()
}

// ── row actions ──
const target = ref<Member | null>(null)
const mode = ref<Exclude<ActionKey, 'resend'> | null>(null)
const newRole = ref<StaffRole>('support')
const dialogError = ref('')
const dialogLoading = ref(false)
const resendingId = ref<number | null>(null)

/** Someone else changed the list first: say so and show the current one. */
const staleCodes = ['member_not_found', 'invitation_invalid']

const pick = (m: Member, key: ActionKey) => {
  notice.value = null
  target.value = m
  dialogError.value = ''
  if (key === 'resend') { void doResend(m); return }
  if (key === 'role') newRole.value = m.role === 'superadmin' ? 'support' : 'superadmin'
  mode.value = key
}

const doResend = async (m: Member) => {
  resendingId.value = m.id
  try {
    const { member: updated, mailSent } = await resendInvitation(m.id)
    notice.value = mailSent
      ? { type: 'success', text: `Reenviamos la invitación a ${m.email}. ${capitalize(expiryLabel(updated.invitation?.expiresAt))}.` }
      : { type: 'warning', text: `${MAIL_FAILED} (${m.email})` }
  } catch (e) {
    const err = parseTeamError(e)
    notice.value = { type: 'error', text: err.message }
    if (err.code && staleCodes.includes(err.code)) await load()
  } finally { resendingId.value = null }
  await load()
}

const closeDialog = () => { mode.value = null }

const DIALOGS: Record<Exclude<ActionKey, 'resend'>, { title: string; confirm: string; danger?: boolean; message: (name: string) => string }> = {
  revoke: { title: 'Revocar la invitación', confirm: 'Revocar', danger: true, message: n => `El enlace que le enviamos a ${n} dejará de funcionar. Puedes invitarla de nuevo cuando quieras.` },
  role: { title: 'Cambiar el rol', confirm: 'Cambiar rol', message: n => `Cambiar el rol de ${n}.` },
  suspend: { title: 'Suspender el acceso', confirm: 'Suspender', danger: true, message: n => `${n} no podrá entrar al panel y cerramos sus sesiones. Su cuenta y su historial se conservan; puedes reactivarla cuando quieras.` },
  reactivate: { title: 'Reactivar el acceso', confirm: 'Reactivar', message: n => `${n} podrá volver a entrar al panel con su contraseña de siempre.` },
  twofactor: { title: 'Reiniciar los dos pasos', confirm: 'Reiniciar dos pasos', danger: true, message: n => `Apagamos la verificación en dos pasos de ${n}, cerramos todas sus sesiones y le avisamos por correo. Tendrá que volver a activarla.` },
  remove: { title: 'Quitar del equipo', confirm: 'Quitar del equipo', danger: true, message: n => `${n} ya no podrá entrar al panel. La cuenta sigue existiendo en Quinvite.` },
}
const dialog = computed(() => (mode.value ? DIALOGS[mode.value] : null))

const act = async (reason: string) => {
  const m = target.value
  if (!m || !mode.value) return
  dialogLoading.value = true
  dialogError.value = ''
  try {
    switch (mode.value) {
      case 'revoke': await revokeInvitation(m.id, reason); notice.value = { type: 'success', text: `Revocamos la invitación de ${m.email}.` }; break
      case 'role': await changeRole(m.id, newRole.value, reason); notice.value = { type: 'success', text: `${m.name} ahora es ${ROLE_LABELS[newRole.value]}.` }; break
      case 'suspend': await suspendMember(m.id, reason); notice.value = { type: 'success', text: `Suspendimos a ${m.name}. Ya no puede entrar al panel.` }; break
      case 'reactivate': await reactivateMember(m.id, reason); notice.value = { type: 'success', text: `Reactivamos a ${m.name}.` }; break
      case 'remove': await removeMember(m.id, reason); notice.value = { type: 'success', text: `${m.name} ya no está en el equipo.` }; break
      case 'twofactor': {
        const n = await resetTwoFactor(m.id, reason)
        notice.value = { type: 'success', text: `Reiniciamos los dos pasos de ${m.name}, ${n ? `cerramos ${n === 1 ? 'su sesión' : `sus ${n} sesiones`}` : 'no tenía sesiones abiertas'} y le avisamos por correo.` }
        break
      }
    }
    mode.value = null
    await load()
  } catch (e) {
    const err = parseTeamError(e)
    dialogError.value = err.message
    if (err.code && staleCodes.includes(err.code)) { mode.value = null; notice.value = { type: 'error', text: err.message }; await load() }
  } finally { dialogLoading.value = false }
}

const headers = ['Persona', 'Rol', 'Estado', 'Dos pasos', 'Último acceso']
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="title">Equipo y roles</h2>
        <p class="text-medium-emphasis">Quién puede entrar al panel y qué puede hacer. Cada cambio pide un motivo y queda en la auditoría.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus-outline" class="touch" @click="inviteOpen = true">Invitar a una persona</v-btn>
    </header>

    <div aria-live="polite">
      <v-alert v-if="notice" :type="notice.type" variant="tonal" closable class="mb-4" :text="notice.text" @click:close="notice = null" />
    </div>
    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar el equipo.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" md="5">
          <v-text-field v-model="filters.search" label="Buscar por nombre o correo" prepend-inner-icon="mdi-magnify" clearable hide-details autocomplete="off" />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.status" :items="STATUS_ITEMS" label="Estado" clearable hide-details />
        </v-col>
        <v-col cols="6" md="2">
          <v-select v-model="filters.role" :items="ROLE_ITEMS" label="Rol" clearable hide-details />
        </v-col>
        <v-col cols="12" md="3" class="d-flex align-center">
          <v-btn v-if="filtered" variant="text" prepend-icon="mdi-filter-off-outline" class="touch" @click="clearFilters">Quitar filtros</v-btn>
          <span v-else-if="members.length" class="text-body-2 text-medium-emphasis">{{ counts.active }} activos · {{ counts.invited }} invitados · {{ counts.suspended }} suspendidos</span>
        </v-col>
      </v-row>
    </v-card>

    <p class="sr-only" role="status" aria-live="polite">{{ loading ? 'Cargando…' : `${visible.length} de ${members.length} personas` }}</p>

    <!-- Loading, first time -->
    <v-card v-if="loading && !members.length" class="pa-2" aria-busy="true">
      <v-skeleton-loader type="list-item-two-line@4" />
    </v-card>

    <!-- Empty -->
    <v-card v-else-if="!visible.length && !failed" class="pa-8 empty">
      <v-icon size="40" icon="mdi-account-group-outline" color="primary" class="mb-3" />
      <template v-if="filtered">
        <p class="empty__title">Nadie coincide con esos filtros.</p>
        <v-btn variant="tonal" class="touch mt-3" @click="clearFilters">Quitar filtros</v-btn>
      </template>
      <template v-else>
        <p class="empty__title">Todavía no hay nadie en el equipo.</p>
        <p class="text-medium-emphasis">Invita a la primera persona con su correo.</p>
        <v-btn color="primary" class="touch mt-3" prepend-icon="mdi-account-plus-outline" @click="inviteOpen = true">Invitar a una persona</v-btn>
      </template>
    </v-card>

    <!-- Phone: cards -->
    <div v-else-if="smAndDown" class="cards" :class="{ 'is-loading': loading }">
      <v-card v-for="m in visible" :key="m.id" class="mcard" :data-member="m.id">
        <div class="mcard__top">
          <div class="mcard__who">
            <strong class="mcard__name">{{ m.name }}</strong><v-chip v-if="self(m)" size="x-small" class="ml-2" variant="outlined">Tú</v-chip>
            <p class="mcard__mail">{{ m.email }}</p>
          </div>
          <MemberActions :name="m.name" :actions="actionsOf(m)" @pick="pick(m, $event)" />
        </div>
        <div class="mcard__chips">
          <v-chip :color="m.role === 'superadmin' ? 'primary' : 'secondary'" variant="tonal" size="small">{{ ROLE_LABELS[m.role] }}</v-chip>
          <MemberStatus :member="m" />
        </div>
        <p class="mcard__meta">
          <v-icon size="16" :icon="m.twoFactorEnabled ? 'mdi-shield-check-outline' : 'mdi-shield-off-outline'" />
          {{ m.status === 'invited' ? 'Aún sin cuenta activa' : m.twoFactorEnabled ? 'Dos pasos activados' : 'Sin dos pasos' }} · {{ lastLoginLabel(m.lastLoginAt) }}
        </p>
        <v-progress-linear v-if="resendingId === m.id" indeterminate height="3" aria-label="Reenviando" />
      </v-card>
    </div>

    <!-- Desktop: table -->
    <v-card v-else class="table-card" :class="{ 'is-loading': loading }">
      <v-table>
        <thead>
          <tr>
            <th v-for="h in headers" :key="h" scope="col">{{ h }}</th>
            <th scope="col" class="text-right"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in visible" :key="m.id" :data-member="m.id">
            <td>
              <strong>{{ m.name }}</strong><v-chip v-if="self(m)" size="x-small" class="ml-2" variant="outlined">Tú</v-chip>
              <div class="mail">{{ m.email }}</div>
            </td>
            <td><v-chip :color="m.role === 'superadmin' ? 'primary' : 'secondary'" variant="tonal" size="small">{{ ROLE_LABELS[m.role] }}</v-chip></td>
            <td><MemberStatus :member="m" /></td>
            <td>
              <span v-if="m.status === 'invited'" class="text-medium-emphasis" aria-label="Todavía no aplica">—</span>
              <span v-else class="twofa" :class="{ 'twofa--on': m.twoFactorEnabled }"><v-icon size="18" :icon="m.twoFactorEnabled ? 'mdi-shield-check-outline' : 'mdi-shield-off-outline'" />{{ m.twoFactorEnabled ? 'Sí' : 'No' }}</span>
            </td>
            <td class="nowrap">{{ lastLoginLabel(m.lastLoginAt) }}</td>
            <td class="text-right nowrap">
              <v-progress-circular v-if="resendingId === m.id" indeterminate size="20" width="2" class="mr-2" aria-label="Reenviando" />
              <MemberActions :name="m.name" :actions="actionsOf(m)" @pick="pick(m, $event)" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <InviteDialog v-model="inviteOpen" @invited="onInvited" />

    <ReasonDialog
      :model-value="mode !== null"
      :title="dialog?.title ?? ''"
      :message="dialog && target ? dialog.message(target.name) : ''"
      :confirm-label="dialog?.confirm"
      :danger="dialog?.danger"
      :loading="dialogLoading"
      :error="dialogError"
      @update:model-value="closeDialog"
      @confirm="act"
    >
      <RoleField v-if="mode === 'role'" v-model="newRole" label="Nuevo rol" />
    </ReasonDialog>
  </section>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.title { font-size: 2rem; margin-bottom: 4px; }
.touch { min-height: 44px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.mail { font-size: 0.8125rem; color: var(--ink-500); overflow-wrap: anywhere; }
.twofa { display: inline-flex; align-items: center; gap: 6px; color: var(--ink-500); }
.twofa--on { color: rgb(var(--v-theme-success)); }
.empty { text-align: center; }
.empty__title { font-family: var(--font-heading); font-size: 1.25rem; }
.cards { display: grid; gap: 12px; }
.mcard { padding: 14px 16px; }
.mcard__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.mcard__who { min-width: 0; }
.mcard__name { overflow-wrap: anywhere; }
.mcard__mail { margin: 2px 0 0; color: var(--ink-500); font-size: 0.875rem; overflow-wrap: anywhere; }
.mcard__chips { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px; margin: 8px 0; }
.mcard__meta { margin: 0; font-size: 0.8125rem; color: var(--ink-500); display: flex; align-items: center; gap: 6px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
