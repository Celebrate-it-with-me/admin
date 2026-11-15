<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { createGrant, listGrants, revokeGrant } from '../packagesApi'
import { explainPackageError, formatDateTime } from '../logic'
import type { Grant } from '../types'

/** Who may use a private package (spec §6b): grants by event or by account. Granting is a separate step after the sale is paid. */
const props = defineProps<{ packageId: number }>()

const grants = ref<Grant[] | null>(null)
const loading = ref(true)
const failed = ref('')
const notice = ref('')

const load = async () => {
  loading.value = true
  failed.value = ''
  try { grants.value = await listGrants(props.packageId) } catch (e) { failed.value = explainPackageError(e).message } finally { loading.value = false }
}
onMounted(load)

const addOpen = ref(false)
const kind = ref<'event' | 'user'>('event')
const targetId = ref('')
const addBusy = ref(false)
const addError = ref('')
const idValid = () => /^\d+$/.test(targetId.value.trim()) && Number(targetId.value) > 0

const openAdd = () => { kind.value = 'event'; targetId.value = ''; addError.value = ''; addOpen.value = true }
const confirmAdd = async (reason: string) => {
  if (!idValid()) { addError.value = 'Escribe el número del evento o de la cuenta.'; return }
  addBusy.value = true
  addError.value = ''
  try {
    const id = Number(targetId.value)
    await createGrant(props.packageId, kind.value === 'event' ? { eventId: id } : { userId: id }, reason)
    addOpen.value = false
    notice.value = 'Acceso concedido.'
    await load()
  } catch (e) { addError.value = explainPackageError(e).message } finally { addBusy.value = false }
}

const revoking = ref<Grant | null>(null)
const revokeBusy = ref(false)
const revokeError = ref('')
const revokeOpen = ref(false)
const startRevoke = (g: Grant) => { revoking.value = g; revokeError.value = ''; revokeOpen.value = true }
const confirmRevoke = async (reason: string) => {
  if (!revoking.value) return
  revokeBusy.value = true
  revokeError.value = ''
  try {
    await revokeGrant(props.packageId, revoking.value.id, reason)
    revokeOpen.value = false
    notice.value = 'Acceso revocado. Las invitaciones ya publicadas siguen igual.'
    await load()
  } catch (e) { revokeError.value = explainPackageError(e).message } finally { revokeBusy.value = false }
}
const target = (g: Grant) => (g.eventId ? `Evento ${g.eventId}` : `Cuenta ${g.userId}`)
</script>

<template>
  <section aria-labelledby="grants-title">
    <div class="head">
      <h3 id="grants-title" class="h">Accesos</h3>
      <v-btn size="small" variant="tonal" prepend-icon="mdi-plus" @click="openAdd">Conceder acceso</v-btn>
    </div>
    <p class="text-medium-emphasis small">Un paquete privado solo lo pueden usar los eventos o cuentas con acceso vigente. Revocarlo no cambia una invitación ya publicada.</p>
    <v-alert v-if="notice" type="success" variant="tonal" density="compact" closable class="mb-2" aria-live="polite" @click:close="notice = ''">{{ notice }}</v-alert>
    <div v-if="loading" aria-busy="true"><v-skeleton-loader type="list-item-two-line" /></div>
    <v-alert v-else-if="failed" type="error" variant="tonal" density="compact">
      {{ failed }} <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>
    <p v-else-if="grants && grants.length === 0" class="text-medium-emphasis">Todavía no hay accesos concedidos.</p>
    <ul v-else class="list">
      <li v-for="g in grants" :key="g.id" :data-grant="g.id">
        <div class="min">
          <strong>{{ target(g) }}</strong>
          <v-chip v-if="g.revokedAt" size="x-small" variant="tonal" class="ml-2">Revocado</v-chip>
          <p class="meta">{{ g.grantReason }} · {{ formatDateTime(g.createdAt) }}</p>
          <p v-if="g.revokedAt" class="meta">Revocado el {{ formatDateTime(g.revokedAt) }}: {{ g.revokeReason }}</p>
        </div>
        <v-btn v-if="!g.revokedAt" size="small" variant="text" color="error" @click="startRevoke(g)">Revocar</v-btn>
      </li>
    </ul>

    <ReasonDialog v-model="addOpen" title="Conceder acceso" confirm-label="Conceder" :loading="addBusy" :error="addError" @confirm="confirmAdd">
      <v-radio-group v-model="kind" inline hide-details class="mb-2" aria-label="Destino del acceso">
        <v-radio label="Un evento" value="event" /><v-radio label="Una cuenta" value="user" />
      </v-radio-group>
      <v-text-field v-model="targetId" :label="kind === 'event' ? 'Número del evento' : 'Número de la cuenta'" inputmode="numeric" density="comfortable" class="mb-2" />
    </ReasonDialog>
    <ReasonDialog
      v-model="revokeOpen" title="Revocar acceso" confirm-label="Revocar" danger :loading="revokeBusy" :error="revokeError"
      message="Los eventos publicados siguen viéndose igual. Los que no se han publicado vuelven a la plantilla gratuita." @confirm="confirmRevoke"
    />
  </section>
</template>

<style scoped>
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.h { font-size: 1.15rem; margin: 0; }
.small { font-size: 0.9rem; margin: 4px 0 8px; }
.list { list-style: none; margin: 0; padding: 0; }
.list li { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); }
.min { min-width: 0; }
.meta { margin: 2px 0 0; color: var(--ink-500); font-size: 0.88rem; overflow-wrap: anywhere; }
</style>
