<script setup lang="ts">
import TheModal from "@/components/TheModal.vue"
import { ref, computed, watch } from "vue"
import { API } from "@/services/axios"
import type { ApiErrorResponse, UserItem } from "@/types"

const props = defineProps({
  openModal: {
    type: Boolean,
    required: false,
    default: false
  },

  editItem: {
    type: Object,
    required: true,
    default() {
      return {}
    }
  },
})

const emit = defineEmits(['closeModal', 'reloadUser'])
const sendingRequest = ref(false)
const valid = ref(false)
const userForm = ref<{ validate: () => Promise<{ valid: boolean }> } | null>(null)
const showAlert = ref(false)
const actionType = ref('Add')
const alertType = ref<'success' | 'warning' | 'error' | 'info'>('warning')
const alertMessage = ref('')
const modalTitle = computed(() => {
  return `${actionType.value} User`
})

const form = ref({
  name: '',
  email: '',
  password: '',
})

const formValidation = ref<Record<string, Array<(v: string) => boolean | string>>>({
  name: [(v: string) => !!v || "Name is required"],
  email: [(v: string) => !!v || "Email is required"],
})

const handleClose = () => {
  resetForm()
  emit('closeModal')
}

const submitForm = async () => {
  sendingRequest.value = true
  try {
    const { valid } = await userForm.value!.validate()

    if (valid) {
      showAlert.value = false
      alertMessage.value = ''
      if (actionType.value === 'Add') {
        await createUser()
      } else {
        await updateUser()
      }
    } else {
      showAlert.value = true
      alertMessage.value = 'There is some errors in the form, please fix and try again'
      sendingRequest.value = false
    }
  } catch (err) {
    console.log(err)
  }
}

const createUser = async () => {
  const { status, response }: { status: number; response?: ApiErrorResponse } = await API.post('users', {
    name: form.value.name,
    email: form.value.email,
    password: form.value.password
  })
  processRequest(status, response as ApiErrorResponse)
}

const updateUser = async () => {
  const { status, response }: { status: number; response?: ApiErrorResponse } = await API.patch(`users/${props.editItem.id}`, {
    name: form.value.name,
    email: form.value.email,
    password: form.value.password
  })
  processRequest(status, response as ApiErrorResponse)
}

const processRequest = (status: number, response: ApiErrorResponse) => {
  if (status >= 200 && status < 300) {
    sendingRequest.value = false
    resetForm()
    emit('reloadUser')
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
    name: '',
    email: '',
    password: ''
  }

  sendingRequest.value = false
  valid.value = false
  userForm.value = null
  showAlert.value = false
  actionType.value = 'Add'
  alertType.value = 'warning'
  alertMessage.value = ''
}

watch(() => props.editItem, (value) => {
  initForm(value as UserItem)
})

const initForm = (item: UserItem) => {
  if (Object.keys(item).length) {
    actionType.value = 'Edit'
    form.value.name = item.name
    form.value.email = item.email
    form.value.password = ''
    formValidation.value.password = [() => true]
  } else {
    actionType.value = 'Add'
    form.value.name = ''
    form.value.email = ''
    form.value.password = ''
    formValidation.value.password = [(v: string) => !!v || "Password is required"]
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
        ref="userForm"
      >
        <v-container>
          <v-row>
            <v-col
              cols="12"
              sm="12"
              md="12"
            >
              <v-text-field
                label="Name"
                hint="Full Name"
                required
                v-model="form.name"
                :rules="formValidation.name"
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
                label="Password"
                hint="Password"
                type="password"
                requried
                v-model="form.password"
                :rules="formValidation.password"
              >
              </v-text-field>
            </v-col>
          </v-row>
        </v-container>
      </v-form>
    </template>
    <template v-slot:dialogFooter>
      <v-btn
        color="primary"
        variant="text"
        @click="handleClose()"
      >
        Close
      </v-btn>
      <v-btn
        color="primary"
        variant="text"
        type="submit"
        form="create-form"
        :loading="sendingRequest"
        :disabled="sendingRequest"
      >
        {{ (actionType ===  'Add') ? 'Create' : 'Update' }}
      </v-btn>
    </template>
  </the-modal>
</v-row>
</template>

<style scoped>

</style>
