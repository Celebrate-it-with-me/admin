<script setup>

import {onMounted, ref, watch} from "vue";
import {API} from "@/services/axios";
import MainGuestTr from "@/components/rsvp/totals/MainGuest/MainGuestTr.vue";
import ExportButton from "@/components/export_button/ExportButton.vue";

const props = defineProps({
  totalType: {
    type: String,
    required: false,
    default: 'totalGuest'
  }
});

const errorMessage = ref('');
const details = ref([]);
const guests = ref([]);

onMounted(() => {
  loadTotals()
})

watch(details, (newValue) => {
  handleGuests(newValue);
})

const handleGuests = (details) => {
  let allGuests = [];
  if (details.length) {
    details.forEach(guest => {
      allGuests.push({
        name: `${guest.first_name} ${guest.last_name}`,
        isMain: 'yes',
        confirmed: guest.confirmed,
        phoneNumber: guest.phone_number,
        partyMembers: guest.party_members
      })
    })
  }

  guests.value = allGuests;
}

const loadTotals = async () => {
  try {
    const response = await API.get(`totals/details/${props.totalType}`)

    if (response.status >= 200 && response.status < 300) {
      details.value = response.data?.totals ?? [];
    }
  } catch(e) {
    errorMessage.value = 'Ups, Something went wrong, please try again later!';
  }
}
</script>

<template>
  <v-container v-if="!errorMessage">
    <v-table density="compact">
      <thead>
      <tr>
        <th>Name</th>
        <th>Is Main</th>
        <th>Confirmed</th>
        <th>Phone Number</th>
      </tr>
      </thead>
      <tbody>
        <MainGuestTr
          v-for="guest in guests"
          :key="guest.phoneNumber"
          :guest="guest"
        />
      </tbody>
    </v-table>

    <export-button
      :download-url="`totals/excel/${props.totalType}`"
      :file-name="'main_guest.xlsx'"
    />
  </v-container>

  <v-alert
    type="error"
    v-else
  >
    {{ errorMessage }}
  </v-alert>
</template>

<style scoped>

</style>
