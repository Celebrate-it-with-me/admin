<script setup lang="ts">
import { ref } from "vue"
import { API } from "@/services/axios"
import ReasonDialog from "@/components/ReasonDialog.vue"

const props = defineProps({
  openModal: { type: Boolean, required: false, default: false },
  selectedItem: { type: Object, required: true, default() { return {} } },
})

const emit = defineEmits(['closeModal', 'reloadUser'])
const loading = ref(false)
const error = ref('')

const deleteUser = async (reason: string) => {
  loading.value = true
  error.value = ''
  try {
    await API.delete(`users/${props.selectedItem.id}`, { data: { reason } })
    emit('reloadUser')
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status
    error.value = status === 422
      ? 'No se puede borrar: si es del equipo, primero quítale el acceso en "Equipo y roles".'
      : 'No pudimos borrar la cuenta. Inténtalo de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ReasonDialog
    :model-value="props.openModal"
    title="Borrar usuario"
    :message="`Vas a borrar la cuenta de ${props.selectedItem.name ?? ''} (${props.selectedItem.email ?? ''}). Esto no se puede deshacer.`"
    confirm-label="Borrar"
    danger
    :loading="loading"
    :error="error"
    @update:model-value="emit('closeModal')"
    @confirm="deleteUser"
  />
</template>
