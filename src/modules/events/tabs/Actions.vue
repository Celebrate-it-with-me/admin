<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ReasonDialog from '@/components/ReasonDialog.vue'
import ActionCard from '../actions/ActionCard.vue'
import { changeSlug, fetchInvites, findUserByEmail, resendInvite, resendOwnerEmail, runLifecycle, transferOwner, type Invite, type UserHit } from '../actions/api'
import { availableActions, errorMessage, INVITE_STATUS, LIFECYCLE, slugError, type LifecycleAction } from '../actions/logic'
import { dateLabel, roleLabel, STATUS } from '../labels'
import type { EventDetail } from '../types'

const props = defineProps<{ detail: EventDetail }>()
const emit = defineEmits<{ reload: [] }>()

const store = useCurrentUserStore()
const allowed = computed(() => store.can('admin.events.manage'))
const id = computed(() => props.detail.event.id)
const status = computed(() => props.detail.event.status)
const enabled = computed(() => availableActions(status.value))

type Kind = 'lifecycle' | 'ownerEmail' | 'invite' | 'slug' | 'transfer'
interface Dialog { kind: Kind; title: string; message: string; confirm: string; danger: boolean; ack: string; action?: LifecycleAction; invite?: Invite }
const dialog = ref<Dialog | null>(null)
const open = computed({ get: () => dialog.value !== null, set: v => { if (!v) closeDialog() } })
const busy = ref(false)
const error = ref('')
const ack = ref(false)
const done = ref('')

const newSlug = ref('')
const transferEmail = ref('')
const found = ref<UserHit | null>(null)
const lookedUp = ref(false)
const looking = ref(false)

function closeDialog() { dialog.value = null; error.value = ''; ack.value = false }
function openDialog(d: Dialog) { error.value = ''; ack.value = false; dialog.value = d }

const startLifecycle = (action: LifecycleAction) => {
  const l = LIFECYCLE[action]
  openDialog({
    kind: 'lifecycle', action, title: `${l.title} este evento`, message: l.consequence, confirm: l.button, danger: Boolean(l.danger),
    ack: action === 'archive' ? 'Entiendo que la invitación dejará de verse para los invitados.' : '',
  })
}
const startOwnerEmail = () => openDialog({ kind: 'ownerEmail', title: 'Reenviar correo a la dueña', message: `Se enviará a ${props.detail.owner?.email ?? 'la dueña'} el correo de confirmación de cuenta si aún no la confirmó, o el de bienvenida si ya lo hizo.`, confirm: 'Reenviar correo', danger: false, ack: '' })
const startInvite = (invite: Invite) => openDialog({ kind: 'invite', invite, title: 'Reenviar invitación', message: `Se reenviará la invitación a ${invite.email}.`, confirm: 'Reenviar invitación', danger: false, ack: '' })
const startSlug = () => { newSlug.value = ''; openDialog({ kind: 'slug', title: 'Cambiar el enlace público', message: 'Es una acción delicada: cambia la dirección de la invitación.', confirm: 'Cambiar enlace', danger: true, ack: 'Entiendo que los enlaces ya enviados a los invitados dejarán de funcionar.' }) }
const startTransfer = () => { transferEmail.value = ''; found.value = null; lookedUp.value = false; openDialog({ kind: 'transfer', title: 'Transferir la titularidad', message: 'La nueva dueña debe tener una cuenta activa.', confirm: 'Transferir evento', danger: true, ack: 'Entiendo que la dueña actual pasará a ser editora.' }) }

const slugMsg = computed(() => (newSlug.value ? slugError(newSlug.value, props.detail.event.slug) : ''))

async function lookup() {
  const email = transferEmail.value.trim()
  if (!email) return
  looking.value = true
  error.value = ''
  try {
    found.value = await findUserByEmail(email)
    lookedUp.value = true
  } catch (e) { error.value = errorMessage(e, 'No pudimos buscar la cuenta.') } finally { looking.value = false }
}
watch(transferEmail, () => { found.value = null; lookedUp.value = false })

async function confirm(reason: string) {
  const d = dialog.value
  if (!d) return
  if (d.ack && !ack.value) { error.value = 'Marca la casilla para confirmar que lo entiendes.'; return }
  if (d.kind === 'slug' && slugError(newSlug.value, props.detail.event.slug)) { error.value = slugError(newSlug.value, props.detail.event.slug); return }
  if (d.kind === 'transfer' && (!found.value || found.value.suspended)) { error.value = 'Busca y elige una cuenta activa antes de transferir.'; return }

  busy.value = true
  error.value = ''
  try {
    if (d.kind === 'lifecycle' && d.action) { await runLifecycle(id.value, d.action, reason); done.value = `Listo: ${LIFECYCLE[d.action].title.toLowerCase()} el evento.` }
    else if (d.kind === 'ownerEmail') { const r = await resendOwnerEmail(id.value, reason); done.value = r.sent === 'confirm_account' ? 'Se reenvió el correo de confirmación de cuenta.' : 'Se reenvió el correo de bienvenida.' }
    else if (d.kind === 'invite' && d.invite) { await resendInvite(id.value, d.invite.id, reason); done.value = `Se reenvió la invitación a ${d.invite.email}.`; await loadInvites() }
    else if (d.kind === 'slug') { const r = await changeSlug(id.value, newSlug.value, reason); done.value = `El enlace ahora es ${r.slug}. ${r.warning}` }
    else if (d.kind === 'transfer' && found.value) { const r = await transferOwner(id.value, found.value.email, reason); done.value = `${r.newOwner.name} es la nueva dueña.` }
    closeDialog()
    emit('reload')
  } catch (e) {
    error.value = errorMessage(e)
  } finally { busy.value = false }
}

const invites = ref<Invite[]>([])
const invitesError = ref(false)
async function loadInvites() {
  if (!allowed.value) return
  invitesError.value = false
  try { invites.value = await fetchInvites(id.value) } catch { invitesError.value = true }
}
onMounted(loadInvites)
watch(id, loadInvites)
</script>

<template>
  <div>
    <v-alert v-if="!allowed" type="info" variant="tonal" icon="mdi-lock-outline" text="Las acciones sobre el evento son solo para el equipo de administración. Tu rol puede consultar el resto de las pestañas." />

    <template v-else>
      <v-alert v-if="done" type="success" variant="tonal" closable class="mb-4" :text="done" aria-live="polite" @click:close="done = ''" />

      <h3 class="text-h6 mb-3">Estado del evento</h3>
      <v-row>
        <v-col v-for="(l, key) in LIFECYCLE" :key="key" cols="12" sm="6" lg="3">
          <ActionCard
            :title="l.title" :icon="l.icon" :description="l.description" :consequence="l.consequence" :button="l.button" :danger="l.danger"
            :disabled="!enabled.includes(key)"
            :note="enabled.includes(key) ? '' : `No disponible: el evento está ${STATUS[status].label.toLowerCase()}.`"
            @run="startLifecycle(key)"
          />
        </v-col>
      </v-row>

      <h3 class="text-h6 mt-6 mb-3">Correos</h3>
      <v-row>
        <v-col cols="12" md="6">
          <ActionCard title="Reenviar correo a la dueña" icon="mdi-email-fast-outline" button="Reenviar correo" :disabled="!detail.owner"
            description="Reenvía el correo de confirmación de cuenta (o el de bienvenida si ya la confirmó)."
            :note="detail.owner ? `Destino: ${detail.owner.email}` : 'El evento no tiene dueña.'" @run="startOwnerEmail" />
        </v-col>
        <v-col cols="12" md="6">
          <v-card class="pa-5 h-100">
            <div class="d-flex align-center ga-2"><v-icon icon="mdi-account-multiple-plus-outline" color="primary" aria-hidden="true" /><h3 class="text-h6">Invitaciones de colaboración</h3></div>
            <p class="mt-2 text-body-2 text-medium-emphasis">Solo se pueden reenviar las pendientes y vigentes.</p>
            <v-alert v-if="invitesError" type="error" variant="tonal" density="compact" class="mt-2" text="No pudimos cargar las invitaciones.">
              <template #append><v-btn variant="text" @click="loadInvites">Reintentar</v-btn></template>
            </v-alert>
            <ul v-else-if="invites.length" class="invites mt-2">
              <li v-for="i in invites" :key="i.id">
                <div class="who">
                  <strong>{{ i.email }}</strong>
                  <span class="text-caption text-medium-emphasis">{{ roleLabel(i.role) }} · {{ i.sentAt ? `enviada ${dateLabel(i.sentAt)}` : 'sin enviar' }} · {{ i.resendCount }} {{ i.resendCount === 1 ? 'reenvío' : 'reenvíos' }}</span>
                </div>
                <v-chip size="small" variant="tonal" :color="(INVITE_STATUS[i.status] ?? { color: 'secondary' }).color">{{ (INVITE_STATUS[i.status] ?? { label: i.status }).label }}</v-chip>
                <v-btn v-if="i.status === 'pending'" size="small" variant="tonal" class="btn" @click="startInvite(i)">Reenviar</v-btn>
              </li>
            </ul>
            <p v-else class="mt-2 text-medium-emphasis">Este evento no tiene invitaciones de colaboración.</p>
          </v-card>
        </v-col>
      </v-row>

      <h3 class="text-h6 mt-6 mb-3">Titularidad y enlace</h3>
      <v-row>
        <v-col cols="12" md="6">
          <ActionCard title="Cambiar el enlace público" icon="mdi-link-variant" button="Cambiar enlace" danger
            description="Cambia la dirección de la invitación, incluso si ya estaba bloqueada."
            consequence="Los enlaces que ya se enviaron a los invitados con el enlace anterior dejarán de funcionar. El enlace viejo queda en la auditoría."
            @run="startSlug">
            <p class="text-body-2 mt-3">Enlace actual: <code>{{ detail.event.slug ?? 'sin enlace' }}</code></p>
          </ActionCard>
        </v-col>
        <v-col cols="12" md="6">
          <ActionCard title="Transferir la titularidad" icon="mdi-account-switch-outline" button="Transferir evento" danger
            description="Mueve el evento a otra cuenta existente."
            consequence="La dueña actual pasa a ser editora. Se avisa por correo a las dos cuentas."
            @run="startTransfer">
            <p class="text-body-2 mt-3">Dueña actual: <strong>{{ detail.owner?.name ?? 'sin dueña' }}</strong><template v-if="detail.owner"> ({{ detail.owner.email }})</template></p>
          </ActionCard>
        </v-col>
      </v-row>
    </template>

    <ReasonDialog v-model="open" :title="dialog?.title ?? ''" :message="dialog?.message" :confirm-label="dialog?.confirm" :danger="dialog?.danger" :loading="busy" :error="error" @confirm="confirm">
      <div v-if="dialog?.kind === 'slug'" class="mb-4">
        <p class="text-body-2">Enlace actual: <code>{{ detail.event.slug }}</code></p>
        <v-text-field v-model="newSlug" label="Nuevo enlace" density="comfortable" class="mt-2" autocomplete="off" spellcheck="false" :error-messages="slugMsg" hint="Minúsculas, números y guiones." persistent-hint />
        <p v-if="newSlug && !slugMsg" class="text-body-2 mt-2">Pasará de <code>{{ detail.event.slug }}</code> a <code>{{ newSlug }}</code>.</p>
      </div>

      <div v-if="dialog?.kind === 'transfer'" class="mb-4">
        <form class="lookup" @submit.prevent="lookup">
          <v-text-field v-model="transferEmail" label="Correo de la nueva dueña" type="email" density="comfortable" autocomplete="off" hide-details />
          <v-btn type="submit" variant="tonal" :loading="looking" class="btn">Buscar</v-btn>
        </form>
        <div aria-live="polite" class="mt-3">
          <v-alert v-if="lookedUp && !found" type="warning" variant="tonal" density="compact" text="No existe ninguna cuenta con ese correo." />
          <v-alert v-else-if="found?.suspended" type="error" variant="tonal" density="compact" :text="`${found.name} tiene la cuenta suspendida.`" />
          <v-alert v-else-if="found" type="success" variant="tonal" density="compact">
            <strong>{{ found.name }}</strong> ({{ found.email }})
            <ul class="summary">
              <li>{{ found.name }} será la nueva dueña de «{{ detail.event.name }}».</li>
              <li v-if="detail.owner">{{ detail.owner.name }} pasará a ser editora.</li>
              <li>Las dos cuentas reciben un correo.</li>
            </ul>
          </v-alert>
        </div>
      </div>

      <v-checkbox v-if="dialog?.ack" v-model="ack" :label="dialog.ack" density="comfortable" hide-details class="mb-2" />
    </ReasonDialog>
  </div>
</template>

<style scoped>
.invites { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.invites li { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.who { display: flex; flex-direction: column; min-width: 0; flex: 1 1 180px; overflow-wrap: anywhere; }
.btn { min-height: 44px; }
.lookup { display: flex; gap: 8px; align-items: center; }
.summary { margin: 6px 0 0; padding-left: 18px; }
code { background: var(--cream-200); padding: 2px 6px; border-radius: 6px; overflow-wrap: anywhere; }
</style>
