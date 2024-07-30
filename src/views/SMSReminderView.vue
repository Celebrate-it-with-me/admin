<script setup>
import {computed, onMounted, ref, watch} from 'vue';
import VueDatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'
import {API} from "@/services/axios";
import TheRecipientsModal from "@/components/sms_reminder/TheRecipientsModal.vue";
import TheDeleteSmsReminderModal from "@/components/sms_reminder/TheDeleteSmsReminderModal.vue";

// Data.
const selectedDate = ref('');
const recipients = ref([]);
const recipientSelected = ref('all');
const message = ref('');
const selectedDateError = ref('');
const adding = ref(false);
const loading = ref(false);
const reminders = ref([]);
const total = ref(0);
const params = ref({});
const openRecipientsModal = ref(false);
const openDeleteModal = ref(false);
const selectedItem = ref({});

const activeHintClass = ref('');

const headers = [
  { key: 'recipients', title: 'Recipients', value: 'recipients', sortable: false },
  { key: 'send_date', title: 'Send Date', value: 'sendDate', sortable: false },
  { key: 'message', title: 'Message', value: 'message', sortable: false },
  { key: 'actions', title: 'Actions', value: 'actions', sortable: false}
];

// Computed properties.
const minimumDate = computed(() => {
  const today = new Date();
  const tomorrow = new Date(today);

  return new Date(tomorrow.setDate(today.getDate() + 1));
});

const smsHint = computed(() => {
  let currentLength = 160 - message.value.length;

  if (currentLength < 30) {
    activeHintClass.value = 'hint-warning';
  }

  if (currentLength < 10) {
    activeHintClass.value = 'hint-danger'
  }

  return `${currentLength} remaining characters`;
});

const ableToAdd = computed(() => {
  return !(!recipientSelected.value.length || !selectedDate.value || !message.value);
});

// Validation Rules.
const rules = {
  recipient: [v => !!v.length > 0|| 'Recipients is required!'],
  msg: [v => (v && v.length <= 160) || 'Message is required and should not exceed 160 characters!'],
};

// Event Hooks
onMounted(() => {
  getRecipients();
  getReminders();
})

// Observers
watch(recipientSelected, (newValue) => {
  if (newValue.length > 1 && newValue.includes('all')) {
    recipientSelected.value = newValue.filter(item => item !== 'all');
  }
});

// Methods.
const validateDate = () => {
  if (!selectedDate.value) {
    selectedDateError.value = 'Date is required!';
  } else {
    selectedDateError.value = '';
  }
};

const openRecipientModel = (item) => {
  selectedItem.value = item;
  openRecipientsModal.value = true;
}

const handleDeleteItem = (item) => {
  selectedItem.value = item;
  openDeleteModal.value = true;
}



const getRecipients = async () => {
  try {
    const response = await API.get('sms-reminders/get-recipients');

    if (response.status >= 200 && response.status < 300) {
      recipients.value = response.data?.recipients;
    }

  } catch (e) {
    console.log(e);
  }
}

const filterRecipients = () => {
  return recipients.value.filter(
    recipient => recipientSelected.value.includes(recipient.phoneNumber)
  );
}

const addReminder = async () => {
  adding.value = true;
  try {
    const response = await API.post('sms-reminders', {
      message: message.value,
      sendDate: selectedDate.value,
      recipients: filterRecipients()
    })

    if (response.status >= 200 && response.status < 300) {
      cleanForm();
      await getReminders();
    }

  } catch (e) {
    console.log(e);
  } finally {
    adding.value = false;
  }
};

const cleanForm = () => {
  recipientSelected.value = ['all'];
  selectedDate.value = null;
  message.value = ''
}

const getReminders = async () => {
  loading.value = true;
  try {
    const response = await API.get('sms-reminders', {
      params: {
        ...params.value,
      }
    });


    if (response.status >= 200 && response.status < 300) {
      reminders.value = response.data?.data ?? []
      total.value = response.data?.meta?.total ?? 0
    }

  } catch (e) {
    console.log(e);
  } finally {
    loading.value = false;
  }
}

const handleCloseRecipientsModal = () => {
  openRecipientsModal.value = false;
  selectedItem.value = {}
}

const handleCloseDeleteModal = () => {
  openDeleteModal.value = false;
  selectedItem.value = {};
}

const handleReloadReminders = () => {
  openDeleteModal.value = false;
  getReminders();
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12" md="6">
        <h3 class="mb-4">Setup a New SMS Reminder</h3>
        <v-form>
          <v-autocomplete
            v-model="recipientSelected"
            label="Recipient"
            :items="recipients"
            item-title="name"
            item-value="phoneNumber"
            chips
            closable-chips
            multiple
            :rules="rules.recipient"
          />
          <VueDatePicker
            v-model="selectedDate"
            :enable-time-picker="false"
            :min-date="minimumDate"
            @blur="validateDate"
          />

          <p v-if="selectedDateError" class="error-text">
            {{ selectedDateError }}
          </p>

          <v-textarea
            class="mt-8"
            v-model="message"
            label="Message"
            :maxLength="160"
            :rules="rules.msg"
          />
          <p
            v-if="message.length > 0"
            class="mt-n4"
            :class="activeHintClass"
          >{{ smsHint }}</p>
          <v-btn
            class="mt-8 custom-button"
            @click="addReminder"
            :disabled="!ableToAdd"
            :loading="adding"
          >
            Add Reminder
          </v-btn>
        </v-form>
      </v-col>
      <v-col cols="12" md="6">
        <h3>SMS Reminders List:</h3>
        <small>There is no edit option, if you need to edit a reminder please delete it and create a new one</small>

        <v-data-table
          v-if="reminders.length"
          :headers="headers"
          :items="reminders"
          density="compact"
          items-per-page="10"
          @update:options="(n) => (params = n)"
        >
          <template v-slot:item.recipients="{ item }">
            {{ item.recipients[0].name }}<br/>
            <v-chip
              :color="'info'"
              text="See All Recipients"
              class="text-uppercase"
              label
              size="small"
              @click="openRecipientModel(item.recipients)"
            ></v-chip>
          </template>

          <template v-slot:item.actions="{ item }">
            <v-icon
              icon="mdi-delete-outline"
              @click="handleDeleteItem(item)"
            ></v-icon>
          </template>
        </v-data-table>
        <v-alert
          v-else
          type="warning"
        >
          There is no reminders yet!
        </v-alert>
      </v-col>
    </v-row>
    <the-recipients-modal
      :selected-item="selectedItem"
      :open-modal="openRecipientsModal"
      @closeModal="handleCloseRecipientsModal()"
    />

    <the-delete-sms-reminder-modal
      :selected-item="selectedItem"
      :open-modal="openDeleteModal"
      @closeModal="handleCloseDeleteModal()"
      @reloadReminders="handleReloadReminders()"
    />
  </v-container>
</template>

<style scoped>
.hint-warning {
  color: #FFA500;
}

.hint-danger,.error-text {
  color: #FF0000;
}

.custom-button {
  background-color: rgb(9, 32, 63) !important;
  color: white !important;
}

.see-all {
  text-decoration: underline;
  color: rgb(9, 32, 63) !important;
}
</style>
