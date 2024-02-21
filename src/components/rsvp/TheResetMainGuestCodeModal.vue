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
const alertMessage = ref('Are you sure you want to reset the Main Guest access code!')

const handleClose = () => {
  emit('closeModal')
}

const resetAccessCode = async () => {
  const { status } = await API.post('rsvp/reset-access-code', {
    mainGuest: props.selectedItem.id
  })

  if (status >= 200 && status < 300) {
    emit('reloadMainGuest')
  }
}

</script>

<template>
<v-row justify="center">
  <the-modal :open-modal="props.openModal" title="Confirm Reset Access Code">
    <template v-slot:dialogContent>
      <transition name="bounce">
        <v-alert
          v-model="showAlert"
          density="compact"
          type="warning"
          title="Confirm Reset Access Code"
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
        @click="resetAccessCode()"
      >
        Reset
      </v-btn>
    </template>
  </the-modal>
</v-row>
</template>

<style scoped>

</style>
