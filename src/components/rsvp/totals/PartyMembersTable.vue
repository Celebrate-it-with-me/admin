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
        name: guest.name,
        mainGuest: `${guest.main_guest.first_name} ${guest.main_guest.last_name}`,
        confirmed: guest.confirmed,
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
        <th>Main Guest</th>
        <th>Confirmed</th>
      </tr>
      </thead>
      <tbody>
        <tr
          v-for="(guest, index) in guests"
          :key="index"
        >
          <td>{{ guest.name }}</td>
          <td>{{ guest.mainGuest }}</td>
          <td>{{ guest.confirmed }}</td>
        </tr>
      </tbody>
    </v-table>

    <export-button
      :download-url="`totals/excel/${props.totalType}`"
      :file-name="'party_members.xlsx'"
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
