<script setup lang="ts">
import ReasonDialog from '@/components/ReasonDialog.vue'
import { publishWarning } from '../logic'

defineProps<{ modelValue: boolean; version: number; previousVersion: number | null; eventsOnPrevious: number; loading: boolean; error: string }>()
defineEmits<{ 'update:modelValue': [boolean]; confirm: [string] }>()
</script>

<template>
  <ReasonDialog
    :model-value="modelValue"
    :title="`Publicar la versión ${version}`"
    confirm-label="Publicar"
    :loading="loading"
    :error="error"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="$emit('confirm', $event)"
  >
    <v-alert type="info" variant="tonal" density="compact" class="mb-4">
      <strong>{{ publishWarning(eventsOnPrevious, previousVersion) }}</strong>
      Las invitaciones ya publicadas conservan su aspecto. Los eventos que todavía no se publican y los nuevos usarán esta versión.
      La versión {{ previousVersion ?? 'anterior' }} pasa a archivada y esta no se podrá editar más.
    </v-alert>
  </ReasonDialog>
</template>
