<script setup>

import {onMounted, ref, watch} from "vue";
import {API} from "@/services/axios";
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
      })

      if (guest.party_members.length) {
        guest.party_members.forEach((member) => {
          allGuests.push({
            name: member.name,
            isMain: 'no',
            confirmed: member.confirmed,
            phoneNumber: 'N/A',
          })
        })
      }
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
      <tr
        v-for="guest in guests"
        :key="guest.phoneNumber"
        :class="{'is-main': guest.isMain === 'yes', 'is-member': guest.isMain === 'no' }"
      >
        <td>{{ guest.name }}</td>
        <td>{{ guest.isMain }}</td>
        <td>{{ guest.confirmed }}</td>
        <td>{{ guest.phoneNumber }}</td>
      </tr>
      </tbody>
    </v-table>

    <export-button
      :download-url="`totals/excel/${props.totalType}`"
      :file-name="'total_un_confirmed.xlsx'"
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
.is-main {
  background-color: #1c9177;
  color: white;
}
</style>
