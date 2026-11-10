<script setup lang="ts">
import TheModal from "@/components/TheModal.vue"
import {ref, computed, watch} from "vue"
import { API } from "@/services/axios"
import type { ApiErrorResponse } from "@/types"

const props = defineProps({
  openModal: {
    type: Boolean,
    required: false,
    default: false
  },

  editGuest: {
    type: Object,
    required: true,
    default() {
      return {}
    }
  },
})

const emit = defineEmits(['closeModal', 'reloadMainGuest'])
const sendingRequest = ref(false)
const valid = ref(false)
const mgForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const showAlert = ref(false)
const actionType = ref('Add')
const alertType = ref<'success' | 'warning' | 'error' | 'info'>('warning')
const alertMessage = ref('')
const form = ref({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  numberOfMembers: 0,
});
const partyMembers = ref<{ name: string; confirmed: number }[]>([]);

// Form Validation.
const formValidation = ref<Record<string, Array<(v: string) => boolean | string>>>({
  firstName: [(v: string) => !!v || "First Name is required"],
  lastName: [(v: string) => !!v || "Last Name is required"],
  phoneNumber: [(v: string) => !!v || "Phone Number is required"],
});

// Computed property 'modalTitle'
const modalTitle = computed(() =>
  Object.keys(props.editGuest).length ? "Edit Main Guest" : "Add Main Guest"
);

const handleClose = () => {
  resetForm()
  emit('closeModal')
}

const submitForm = async () => {
  sendingRequest.value = true
  try {
    const { valid } = await mgForm.value!.validate()

    if (valid && validPartyMembers()) {
      showAlert.value = false
      alertMessage.value = ''
      if (actionType.value === 'Add') {
        await createMainGuest()
      } else {
        await updateMainGuest()
      }
    } else {
      showAlert.value = true
      alertMessage.value = 'There is some errors in the form, please fix and try again'
      sendingRequest.value = false
    }
  } catch {
    showAlert.value = true
    alertMessage.value = 'There is some fails sending this request'
    sendingRequest.value = false
  }
}

const createMainGuest = async () => {
  const { status, response }: { status: number; response?: ApiErrorResponse } = await API.post('/main-guest', {
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    email: form.value.email,
    phoneNumber: form.value.phoneNumber,
    partyMembers: JSON.stringify(partyMembers.value)
  })
  processRequest(status, response as ApiErrorResponse)
}

const updateMainGuest = async () => {
  const { status, response }: { status: number; response?: ApiErrorResponse } = await API.patch(`main-guest/${props.editGuest.id}`, {
    firstName: form.value.firstName,
    lastName: form.value.lastName,
    email: form.value.email,
    phoneNumber: form.value.phoneNumber,
    partyMembers: JSON.stringify(partyMembers.value)
  })

  processRequest(status, response as ApiErrorResponse)
}

const processRequest = (status: number, response: ApiErrorResponse) => {
  if (status >= 200 && status < 300) {
    sendingRequest.value = false
    resetForm()
    emit('reloadMainGuest')
  } else {
    sendingRequest.value = false
    showAlert.value = true
    const { data } = response
    alertMessage.value = data.message
    alertType.value = 'error'
  }
}

const resetForm = () => {
  form.value = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    numberOfMembers: 0
  }

  sendingRequest.value = false
  valid.value = false
  mgForm.value = null
  showAlert.value = false
  actionType.value = 'Add'
  alertType.value = 'warning'
  alertMessage.value = ''
  partyMembers.value = [];
  emit('reloadMainGuest')
}

watch(() => props.openModal, (value) => {
  if (value) {
    initForm();
  }
})

watch(() => form.value.numberOfMembers, (value) =>  {
  if ( value) {
    if (actionType.value === 'Add') {
      partyMembers.value = []
      for(let i = 0; i < value; i ++) {
        partyMembers.value[i] =  { name: '', confirmed: 1}
      }
    } else {
      if (value > partyMembers.value.length) {
        for (let i = partyMembers.value.length; i < value; i++) {
          partyMembers.value[i] =  { name: '', confirmed: 1}
        }
      }

      if (value < partyMembers.value.length) {
        partyMembers.value.pop();
      }
    }
  }
})

const initForm = () => {
  if (Object.keys(props.editGuest).length) {
    actionType.value = 'Edit'
    form.value.firstName = props.editGuest.firstName
    form.value.lastName = props.editGuest.lastName
    form.value.email = props.editGuest.email
    form.value.phoneNumber = props.editGuest.phoneNumber

    form.value.numberOfMembers = props.editGuest.partyMembers.length;
    if (props.editGuest.partyMembers.length > 0) {
      partyMembers.value = props.editGuest.partyMembers
    }
  } else {
    actionType.value = 'Add'
    form.value.firstName = ''
    form.value.lastName = ''
    form.value.email = ''
    form.value.phoneNumber = ''
    form.value.numberOfMembers = 0
  }
}

const validPartyMembers = () => {
  let isValid = true;

  partyMembers.value.forEach((member) => {
    if (member.name === '') {
      isValid = false;
    }
  })

  return isValid;
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
          title="Invalid"
          :text="alertMessage"
          :closable="true"
        >
        </v-alert>
      </transition>
      <v-form
        id="create-form"
        v-model="valid"
        @submit.prevent="submitForm()"
        ref="mgForm"
      >
        <v-container>
          <v-row>
            <v-col
              cols="6"
              sm="6"
              md="6"
            >
              <v-text-field
                label="First Name"
                hint="First Name"
                required
                v-model="form.firstName"
                :rules="formValidation.firstName"
              >
              </v-text-field>
            </v-col>
            <v-col
              cols="6"
              sm="6"
              md="6"
            >
              <v-text-field
                label="Last Name"
                hint="Last Name"
                required
                v-model="form.lastName"
                :rules="formValidation.lastName"
              >
              </v-text-field>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="6"
            >
              <v-text-field
                label="Email"
                hint="Email"
                required
                v-model="form.email"
                :rules="formValidation.email"
              ></v-text-field>
            </v-col>
            <v-col
              cols="12"
              sm="6"
              md="6"
            >
              <v-text-field
                label="Phone Number"
                hint="Phone Number"
                type="text"
                requried
                v-model="form.phoneNumber"
                :rules="formValidation.phoneNumber"
              >
              </v-text-field>
            </v-col>
            <v-col
              cols="6"
              sm="6"
              md="6"
            >
              <v-text-field
                label="Number of Companions"
                hint="Number of Companions"
                type="number"
                min="0"
                required
                v-model="form.numberOfMembers"
                :rules="formValidation.numberOfMembers"
              >
              </v-text-field>
            </v-col>
          </v-row>
          <v-divider></v-divider>
          <v-row
            v-if="form.numberOfMembers > 0"
            class="mt-2"
          >
            <v-col
              cols="12"
              sm="12"
            >
              <h3>Party Members</h3>
            </v-col>
            <v-col
              v-for="(member, index) in partyMembers"
              :key="index"
              cols="12"
              sm="6"
              md="6"
            >
              <v-text-field
                :label="`Member Guest ${index + 1}`"
                hint="Member Guest"
                type="text"
                requried
                v-model="member.name"
              >
              </v-text-field>
            </v-col>
          </v-row>

        </v-container>
      </v-form>
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
        type="submit"
        form="create-form"
        :loading="sendingRequest"
        :disabled="sendingRequest"
      >
        {{ (actionType ===  'Add') ? 'Add' : 'Update' }}
      </v-btn>
    </template>
  </the-modal>
</v-row>
</template>

<style scoped>

</style>
