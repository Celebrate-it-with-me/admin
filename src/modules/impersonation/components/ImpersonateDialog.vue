<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { API } from '@/services/axios'
import { useCurrentUserStore } from '@/store/currentUser'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { SESSION_MINUTES, buildImpersonationUrl, explainImpersonationError } from '../logic'

const props = defineProps<{
  modelValue: boolean
  user: { id: number; name: string }
  /** When the entry comes from a support request, so the audit links them. */
  supportRequestId?: number | null
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; started: [] }>()

const me = useCurrentUserStore()
const isSuperadmin = computed(() => (me.user.roles ?? []).includes('superadmin'))

const loading = ref(false)
const error = ref('')
const silent = ref(false)

watch(() => props.modelValue, open => { if (open) { error.value = ''; silent.value = false } })

const start = async (reason: string) => {
  loading.value = true
  error.value = ''
  try {
    const body: Record<string, unknown> = { reason }
    if (props.supportRequestId) body.supportRequestId = props.supportRequestId
    if (isSuperadmin.value && silent.value) body.notify = false
    const { data } = await API.post(`users/${props.user.id}/impersonate`, body)
    const url = buildImpersonationUrl(import.meta.env.VITE_BASE_URL as string, data.token, data.expiresAt)
    // noopener: the app tab gets no handle on this one; the token travels in the fragment only.
    window.open(url, '_blank', 'noopener')
    emit('update:modelValue', false)
    emit('started')
  } catch (e) { error.value = explainImpersonationError(e) } finally { loading.value = false }
}
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    :title="`Entrar como ${user.name}`"
    confirm-label="Entrar como esta usuaria"
    :loading="loading"
    :error="error"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="start"
  >
    <v-alert type="info" variant="tonal" density="compact" class="mb-4" icon="mdi-shield-account-outline">
      <ul class="rules">
        <li>Verás la app tal como ella la ve, en una pestaña nueva. Todo lo que hagas queda auditado a tu nombre.</li>
        <li>La sesión dura {{ SESSION_MINUTES }} minutos y no se renueva.</li>
        <li>Cuando termine, ella recibirá un correo avisándole que soporte entró a su cuenta.</li>
        <li>No se puede cambiar contraseña ni verificación en dos pasos, comprar, exportar datos, borrar el evento ni gestionar colaboradoras.</li>
      </ul>
    </v-alert>
    <div v-if="isSuperadmin" class="mb-2">
      <v-checkbox v-model="silent" density="compact" hide-details label="No avisar a la usuaria (investigación)" />
      <v-alert v-if="silent" type="warning" variant="tonal" density="compact" class="mt-2" role="alert"
        text="Ella no recibirá ningún correo. Úsalo solo en una investigación; queda registrado en la auditoría que se entró sin avisar." />
    </div>
  </ReasonDialog>
</template>

<style scoped>
.rules { margin: 0; padding-left: 18px; display: grid; gap: 4px; }
</style>
