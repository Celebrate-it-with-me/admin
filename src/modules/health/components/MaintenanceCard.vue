<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useCurrentUserStore } from '@/store/currentUser'
import { firstError } from '@/modules/revenue/logic'
import { useLoader } from '../useLoader'
import { fetchMaintenance, setMaintenance } from '../services/healthApi'
import { dateTime } from '../logic'
import HealthCard from './HealthCard.vue'

const me = useCurrentUserStore()
const canManage = computed(() => me.can('admin.system.manage'))

const { data, loading, failed, load } = useLoader(fetchMaintenance)
onMounted(load)
defineExpose({ load })

const message = ref('')
const estimatedEnd = ref('') // value of <input type="datetime-local">, local time
const endError = ref('')

// Fill the form from the server state whenever it changes.
watch(data, s => {
  if (!s) return
  message.value = s.message ?? ''
  estimatedEnd.value = s.estimatedEnd ? toLocalInput(s.estimatedEnd) : ''
}, { immediate: true })

const pad = (n: number) => String(n).padStart(2, '0')
function toLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const open = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const next = ref(false)

const active = computed(() => data.value?.active ?? false)
const maxHours = computed(() => data.value?.maxHours ?? 12)

// The switch never changes by itself: it asks for a reason first, and the real state comes back from the server.
const onSwitch = (value: boolean | null) => {
  endError.value = ''
  if (value) {
    if (estimatedEnd.value) {
      const end = new Date(estimatedEnd.value).getTime()
      if (Number.isNaN(end) || end <= Date.now()) { endError.value = 'La hora estimada ya pasó. Elige una hora futura o déjala vacía.'; return }
      if (end > Date.now() + maxHours.value * 3600_000) { endError.value = `La hora estimada no puede pasar de ${maxHours.value} horas.`; return }
    }
  }
  next.value = !!value
  error.value = ''
  open.value = true
}

const confirm = async (reason: string) => {
  busy.value = true
  error.value = ''
  try {
    const state = await setMaintenance({
      active: next.value,
      reason,
      ...(next.value ? { message: message.value.trim() || null, estimatedEnd: estimatedEnd.value ? new Date(estimatedEnd.value).toISOString() : null } : {}),
    })
    data.value = state
    open.value = false
    notice.value = state.active ? 'Modo mantenimiento activado. El panel de administración sigue disponible.' : 'Modo mantenimiento desactivado. La plataforma vuelve a responder.'
  } catch (e) {
    error.value = firstError(e, 'No pudimos cambiar el modo mantenimiento.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <HealthCard title="Modo mantenimiento" subtitle="Cierra la API para las usuarias y los invitados con un aviso. El panel de administración no se bloquea." icon="mdi-wrench-clock"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos cargar el estado del mantenimiento." @retry="load">
    <template v-if="data">
      <v-alert :type="active ? 'warning' : 'success'" variant="tonal" density="comfortable" class="mb-4" :icon="active ? 'mdi-wrench' : 'mdi-check-circle-outline'">
        <template v-if="active">
          <strong>La plataforma está en mantenimiento.</strong>
          <span v-if="data.activatedBy"> Lo activó {{ data.activatedBy.name }}<template v-if="data.activatedAt"> el {{ dateTime(data.activatedAt) }}</template>.</span>
          <span v-if="data.expiresAt"> Se desactiva sola el {{ dateTime(data.expiresAt) }}.</span>
        </template>
        <template v-else><strong>Todo funciona con normalidad.</strong> Nadie ve avisos de mantenimiento.</template>
      </v-alert>

      <v-alert v-if="notice" type="info" variant="tonal" density="comfortable" closable class="mb-4" :text="notice" @click:close="notice = ''" />

      <div class="form">
        <v-switch
          :model-value="active" :disabled="!canManage || busy" color="warning" hide-details inset class="switch"
          :label="active ? 'Mantenimiento activado' : 'Mantenimiento desactivado'" @update:model-value="onSwitch"
        />
        <v-textarea
          v-model="message" label="Mensaje para las usuarias" rows="2" auto-grow counter="300" maxlength="300"
          :disabled="!canManage || active" hint="Si lo dejas vacío se usa un mensaje estándar." persistent-hint
        />
        <v-text-field
          v-model="estimatedEnd" type="datetime-local" label="Hora estimada de regreso (opcional)"
          :disabled="!canManage || active" :error-messages="endError" hint="Hora de tu zona. Máximo 12 horas." persistent-hint
        />
        <p v-if="!canManage" class="text-body-2 text-medium-emphasis">Solo un superadmin puede cambiar el modo mantenimiento.</p>
        <p v-else-if="active" class="text-body-2 text-medium-emphasis">Para cambiar el mensaje o la hora, desactívalo y vuelve a activarlo.</p>
      </div>
    </template>
  </HealthCard>

  <ReasonDialog
    v-model="open" :loading="busy" :error="error" :danger="next" :confirm-label="next ? 'Activar mantenimiento' : 'Desactivar mantenimiento'"
    :title="next ? 'Activar el modo mantenimiento' : 'Desactivar el modo mantenimiento'"
    :message="next ? 'Mientras esté activo, la app y la invitación responden con un aviso de mantenimiento. El panel de administración sigue funcionando.' : 'La plataforma vuelve a atender a todas las usuarias.'"
    @confirm="confirm"
  />
</template>

<style scoped>
.form { display: grid; gap: 12px; max-width: 560px; }
.switch { min-height: 44px; }
</style>
