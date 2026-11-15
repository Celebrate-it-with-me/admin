<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { getImpact } from '../packagesApi'
import { eventsPinnedLabel, explainPackageError, impactMessage } from '../logic'
import type { Impact } from '../types'

/** Deactivate / withdraw: first shows how many events the action touches (GET impact), then asks for the reason. */
const props = defineProps<{ modelValue: boolean; action: 'deactivate' | 'withdraw'; packageId: number; name: string; loading: boolean; error: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [reason: string] }>()

const impact = ref<Impact | null>(null)
const impactLoading = ref(false)
const impactError = ref('')

const load = async () => {
  impact.value = null
  impactError.value = ''
  impactLoading.value = true
  try { impact.value = await getImpact(props.packageId, props.action) } catch (e) { impactError.value = explainPackageError(e).message } finally { impactLoading.value = false }
}
watch(() => props.modelValue, open => { if (open) load() }, { immediate: true })

const blockedByPinned = computed(() => props.action === 'withdraw' && (impact.value?.eventsPinned ?? 0) > 0)
const title = computed(() => (props.action === 'deactivate' ? `Desactivar ${props.name}` : `Retirar ${props.name}`))
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    :title="title"
    :confirm-label="action === 'deactivate' ? 'Desactivar' : 'Retirar para siempre'"
    danger
    :loading="loading"
    :error="error"
    :confirm-disabled="impactLoading || Boolean(impactError) || blockedByPinned"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="emit('confirm', $event)"
  >
    <div v-if="impactLoading" role="status" aria-busy="true" class="mb-4"><v-progress-circular indeterminate size="18" width="2" class="mr-2" />Calculando a cuántos eventos afecta…</div>
    <v-alert v-else-if="impactError" type="error" variant="tonal" density="compact" class="mb-4">
      {{ impactError }} <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>
    <template v-else-if="impact">
      <v-alert v-if="action === 'deactivate'" :type="impact.eventsUnpublished ? 'warning' : 'info'" variant="tonal" density="compact" class="mb-3" data-testid="impact">
        <strong>{{ impactMessage(impact.eventsUnpublished) }}</strong>
        Los {{ eventsPinnedLabel(impact.eventsPinned) }} ya publicados con este paquete siguen viéndose igual.
      </v-alert>
      <v-alert v-else-if="blockedByPinned" type="error" variant="tonal" density="compact" class="mb-3" data-testid="impact">
        <strong>No se puede retirar: {{ eventsPinnedLabel(impact.eventsPinned) }} usan una versión de este paquete.</strong>
        Desactívalo en su lugar; los eventos publicados no cambian.
      </v-alert>
      <v-alert v-else type="warning" variant="tonal" density="compact" class="mb-3" data-testid="impact">
        <strong>Retirar borra los archivos del paquete y no se puede deshacer.</strong> Ningún evento está fijado a él.
      </v-alert>
    </template>
  </ReasonDialog>
</template>
