<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { API } from '@/services/axios'
import { useCurrentUserStore } from '@/store/currentUser'
import type { StaffRole, TeamMember } from '@/types'
import { ROLE_LABELS } from '@/composables/useAuditLabels'
import ReasonDialog from '@/components/ReasonDialog.vue'

const me = useCurrentUserStore()
const members = ref<TeamMember[]>([])
const loading = ref(true)
const failed = ref(false)

const load = async () => {
  loading.value = true
  failed.value = false
  try { members.value = (await API.get('team')).data.data } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const ROLE_OPTIONS = [
  { value: 'support', title: 'Soporte', subtitle: 'Ve eventos y usuarios, modera, regala funciones e impersona.' },
  { value: 'superadmin', title: 'Superadmin', subtitle: 'Todo lo anterior, más planes, pagos, precio, plantillas y equipo.' },
]

const ERRORS: Record<string, string> = {
  already_staff: 'Esa cuenta ya está en el equipo.',
  name_required: 'Esa cuenta no existe todavía: escribe un nombre para crearla.',
  cannot_change_self: 'No puedes cambiar ni quitar tu propio acceso.',
  last_superadmin: 'Es el último superadmin: no se puede quitar.',
  reason: 'Escribe un motivo de al menos 5 caracteres.',
  user: 'No puedes hacerlo sobre tu propia cuenta.',
}
const CODES: Record<string, string> = {
  two_factor_not_enabled: 'Esa persona no tiene la verificación en dos pasos activa.',
  two_factor_required_to_reset: 'Para reiniciar los dos pasos de otra persona superadmin, activa primero los tuyos en Mi cuenta.',
}
const explain = (e: unknown): string => {
  if ((e as { reauthCancelled?: boolean })?.reauthCancelled) return 'No se hizo ningún cambio: cancelaste la confirmación de identidad.'
  const code = (e as { response?: { data?: { code?: string } } })?.response?.data?.code
  if (code && CODES[code]) return CODES[code]
  const errors = (e as { response?: { data?: { errors?: Record<string, string[]> } } })?.response?.data?.errors ?? {}
  const first = Object.entries(errors)[0]
  return first ? (ERRORS[first[1][0]] ?? ERRORS[first[0]] ?? first[1][0]) : 'No pudimos hacerlo. Inténtalo de nuevo.'
}

// ── add ──
const addOpen = ref(false)
const add = ref({ email: '', name: '', role: 'support' as StaffRole })
const addError = ref('')
const addLoading = ref(false)
const emailOk = computed(() => /^\S+@\S+\.\S+$/.test(add.value.email.trim()))
const created = ref<{ email: string; password: string } | null>(null)
const copied = ref(false)

const openAdd = () => { add.value = { email: '', name: '', role: 'support' }; addError.value = ''; addOpen.value = true }
const doAdd = async (reason: string) => {
  if (!emailOk.value) { addError.value = 'Escribe un correo válido.'; return }
  addLoading.value = true
  addError.value = ''
  try {
    const res = await API.post('team', { email: add.value.email.trim(), name: add.value.name.trim() || undefined, role: add.value.role, reason })
    addOpen.value = false
    if (res.data.temporaryPassword) { created.value = { email: add.value.email.trim(), password: res.data.temporaryPassword }; copied.value = false }
    await load()
  } catch (e) { addError.value = explain(e) } finally { addLoading.value = false }
}
const copy = async () => {
  try { await navigator.clipboard.writeText(created.value?.password ?? ''); copied.value = true } catch { /* the password is on screen to copy by hand */ }
}

// ── change role / remove ──
const target = ref<TeamMember | null>(null)
const mode = ref<'role' | 'remove' | 'twofactor' | null>(null)
const newRole = ref<StaffRole>('support')
const actError = ref('')
const actLoading = ref(false)

const openRole = (m: TeamMember) => { target.value = m; mode.value = 'role'; newRole.value = m.role === 'superadmin' ? 'support' : 'superadmin'; actError.value = '' }
const openRemove = (m: TeamMember) => { target.value = m; mode.value = 'remove'; actError.value = '' }
const openReset = (m: TeamMember) => { target.value = m; mode.value = 'twofactor'; actError.value = '' }
const resetDone = ref('')
const close = () => { mode.value = null }
const act = async (reason: string) => {
  if (!target.value) return
  actLoading.value = true
  actError.value = ''
  try {
    if (mode.value === 'twofactor') {
      const res = await API.post(`team/${target.value.id}/two-factor/reset`, { reason })
      resetDone.value = `Reiniciamos los dos pasos de ${target.value.name}, cerramos sus ${res.data.data.sessionsClosed} sesiones y le avisamos por correo.`
    } else if (mode.value === 'role') await API.patch(`team/${target.value.id}`, { role: newRole.value, reason })
    else await API.delete(`team/${target.value.id}`, { data: { reason } })
    mode.value = null
    await load()
  } catch (e) { actError.value = explain(e) } finally { actLoading.value = false }
}
</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="title">Equipo y roles</h2>
        <p class="text-medium-emphasis">Quién puede entrar al panel y qué puede hacer. Cada cambio pide un motivo y queda en la auditoría.</p>
      </div>
      <v-btn color="primary" prepend-icon="mdi-account-plus-outline" @click="openAdd">Agregar al equipo</v-btn>
    </header>

    <v-alert v-if="resetDone" type="success" variant="tonal" closable class="mb-4" role="status" :text="resetDone" @click:close="resetDone = ''" />
    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar el equipo.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <v-row class="mb-2">
      <v-col v-for="r in ROLE_OPTIONS" :key="r.value" cols="12" md="6">
        <v-card class="pa-4 h-100">
          <v-chip :color="r.value === 'superadmin' ? 'primary' : 'secondary'" variant="tonal" size="small" class="mb-2">{{ r.title }}</v-chip>
          <p class="text-body-2 text-medium-emphasis">{{ r.subtitle }}</p>
        </v-card>
      </v-col>
    </v-row>

    <v-card class="table-card">
      <v-skeleton-loader v-if="loading && !members.length" type="table-row@3" />
      <v-table v-else>
        <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th class="text-right">Acciones</th></tr></thead>
        <tbody>
          <tr v-for="m in members" :key="m.id">
            <td><strong>{{ m.name }}</strong><v-chip v-if="m.id === me.user.id" size="x-small" class="ml-2" variant="outlined">Tú</v-chip></td>
            <td>{{ m.email }}</td>
            <td>
              <v-chip :color="m.role === 'superadmin' ? 'primary' : 'secondary'" variant="tonal" size="small">{{ m.role ? ROLE_LABELS[m.role] : '—' }}</v-chip>
              <v-chip v-if="m.twoFactorEnabled" size="small" variant="outlined" class="ml-2" prepend-icon="mdi-shield-check-outline">Dos pasos</v-chip>
            </td>
            <td class="text-right nowrap">
              <v-btn variant="text" size="small" :disabled="m.id === me.user.id" prepend-icon="mdi-swap-horizontal" @click="openRole(m)">Cambiar rol</v-btn>
              <v-btn v-if="m.twoFactorEnabled" variant="text" size="small" :disabled="m.id === me.user.id" prepend-icon="mdi-shield-refresh-outline" @click="openReset(m)">Reiniciar dos pasos</v-btn>
              <v-btn variant="text" size="small" color="error" :disabled="m.id === me.user.id" prepend-icon="mdi-account-cancel-outline" @click="openRemove(m)">Quitar acceso</v-btn>
            </td>
          </tr>
          <tr v-if="!members.length && !loading"><td colspan="4" class="text-center text-medium-emphasis py-6">Todavía no hay nadie en el equipo.</td></tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Add -->
    <ReasonDialog v-model="addOpen" title="Agregar al equipo" confirm-label="Agregar" :loading="addLoading" :error="addError" @confirm="doAdd">
      <v-text-field v-model="add.email" label="Correo" type="email" autocomplete="off" inputmode="email" />
      <v-text-field v-model="add.name" label="Nombre (solo si la cuenta no existe)" autocomplete="off" />
      <v-radio-group v-model="add.role" label="Rol" class="mb-2">
        <v-radio v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value" :label="r.title" />
      </v-radio-group>
    </ReasonDialog>

    <!-- Change role / remove -->
    <ReasonDialog
      :model-value="mode !== null" :title="mode === 'role' ? 'Cambiar el rol' : mode === 'twofactor' ? 'Reiniciar los dos pasos' : 'Quitar el acceso'"
      :message="mode === 'remove' ? `${target?.name} ya no podrá entrar al panel. La cuenta sigue existiendo.` : mode === 'twofactor' ? `Apagamos la verificación en dos pasos de ${target?.name}, cerramos todas sus sesiones y le avisamos por correo. Tendrá que volver a activarla.` : `Cambiar el rol de ${target?.name}.`"
      :confirm-label="mode === 'role' ? 'Cambiar rol' : mode === 'twofactor' ? 'Reiniciar dos pasos' : 'Quitar acceso'" :danger="mode === 'remove' || mode === 'twofactor'"
      :loading="actLoading" :error="actError" @update:model-value="close" @confirm="act"
    >
      <v-radio-group v-if="mode === 'role'" v-model="newRole" label="Nuevo rol" class="mb-2">
        <v-radio v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value" :label="r.title" />
      </v-radio-group>
    </ReasonDialog>

    <!-- The temporary password: shown once -->
    <v-dialog :model-value="created !== null" max-width="480" persistent>
      <v-card class="pa-2">
        <v-card-title class="dialog-title">Cuenta creada</v-card-title>
        <v-card-text>
          <p class="mb-4">Esta es la contraseña temporal de <strong>{{ created?.email }}</strong>. <strong>Solo se muestra ahora</strong>: cópiala y envíasela por un canal seguro.</p>
          <v-text-field :model-value="created?.password" label="Contraseña temporal" readonly hide-details>
            <template #append-inner><v-btn icon="mdi-content-copy" variant="text" size="small" aria-label="Copiar la contraseña" @click="copy" /></template>
          </v-text-field>
          <p v-if="copied" class="text-success text-body-2 mt-2" role="status">Copiada.</p>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn color="primary" variant="flat" @click="created = null">Ya la copié</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </section>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.title { font-size: 2rem; margin-bottom: 4px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.nowrap { white-space: nowrap; }
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
</style>
