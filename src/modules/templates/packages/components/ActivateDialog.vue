<script setup lang="ts">
import { ref, watch } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import ThirdPartyMarksBanner from './ThirdPartyMarksBanner.vue'
import type { ThirdPartyMark } from '../types'

/** Activating makes the package available to organizers. With third-party marks it needs an explicit confirmation (spec §6c). */
const props = defineProps<{ modelValue: boolean; name: string; semver: string; marks: ThirdPartyMark[]; loading: boolean; error: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; confirm: [reason: string, ack: boolean | undefined] }>()

const ack = ref(false)
watch(() => props.modelValue, open => { if (open) ack.value = false })
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    :title="`Activar ${name} ${semver}`"
    confirm-label="Activar paquete"
    :loading="loading"
    :error="error"
    :confirm-disabled="marks.length > 0 && !ack"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="emit('confirm', $event, marks.length ? ack : undefined)"
  >
    <v-alert type="info" variant="tonal" density="compact" class="mb-4">
      Al activar, las plantillas del paquete se publican y las organizadoras pueden elegirlas. Los eventos ya publicados no cambian de aspecto.
    </v-alert>
    <ThirdPartyMarksBanner v-if="marks.length" class="mb-3" :marks="marks" />
    <v-checkbox
      v-if="marks.length" v-model="ack" color="primary" hide-details class="mb-3"
      label="He revisado la autorización de uso de estas marcas"
    />
  </ReasonDialog>
</template>
