<script setup lang="ts">
import TheModal from "@/components/TheModal.vue"
import { ref } from "vue"
import { API } from "@/services/axios"

const props = defineProps({
  openModal: {
    type: Boolean,
    required: false,
    default: false
  },

  selectedItem: {
    type: Object,
    required: true,
    default() {
      return {}
    }
  },
})

const emit = defineEmits(['closeModal', 'reloadMainGuest'])
const sendingRequest = ref(false)
const showAlert = ref(true)
const alertType = ref('error')
const alertMessage = ref('Are you sure you want to delete this Main Guest!')
const modalTitle = 'Delete Main Guest'

const handleClose = () => {
  emit('closeModal')
}

const deleteMainGuest = async () => {
  const { status } = await API.delete(`main-guest/${props.selectedItem.id}`)

  if (status >= 200 && status < 300) {
    emit('reloadMainGuest')
  }
}

</script>

<template>
<v-row justify="center">
  <the-modal :open-modal="props.openModal" :title="modalTitle">
    <template v-slot:dialogContent>
      <transition name="bounce">
        <v-alert
          v-model="showAlert"
          density="compact"
          :type="alertType"
          title="Confirm Delete"
          :text="alertMessage"
          :closable="true"
        >
        </v-alert>
      </transition>
    </template>
    <template v-slot:dialogFooter>
      <v-btn
        color="blue-darken-1"
        variant="text"
        @click="handleClose()"
      >
        Close
      </v-btn>
      <v-btn
        color="blue-darken-1"
        variant="text"
        form="create-form"
        :loading="sendingRequest"
        :disabled="sendingRequest"
        @click="deleteMainGuest()"
      >
        Delete
      </v-btn>
    </template>
  </the-modal>
</v-row>
</template>

<style scoped>

</style>
