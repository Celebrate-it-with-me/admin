<script setup>
import {onMounted, ref} from "vue";
import {API} from "@/services/axios";
import TotalGuestsTable from "@/components/rsvp/totals/TotalGuestsTable.vue";
import MainGuestsTable from "@/components/rsvp/totals/MainGuestsTable.vue";
import PartyMembersTable from "@/components/rsvp/totals/PartyMembersTable.vue";
import TotalConfirmedTable from "@/components/rsvp/totals/TotalConfirmedTable.vue";
import TotalUnConfirmedTable from "@/components/rsvp/totals/TotalUnConfirmedTable.vue";

const totalGuest = ref(0);
const mainGuests = ref(0);
const partyMembers = ref(0);
const totalConfirmed = ref(0);
const totalUnConfirmed = ref(0);
const loadingDetails = ref(false);
const details = ref([]);
const totalType = ref('');


onMounted(async () => {
  await getTotals();
})

const getTotals = async () => {
  const response = await API.get('totals');

  if (response.status >= 200 && response.status < 300) {
    totalGuest.value = response.data?.totals?.totalGuests ?? 0
    mainGuests.value = response.data?.totals?.mainGuests ?? 0
    partyMembers.value = response.data?.totals?.partyMembers ?? 0
    totalConfirmed.value = response.data?.totals?.totalConfirmed ?? 0
    totalUnConfirmed.value = response.data?.totals?.totalUnConfirmed ?? 0
  }
}

const loadDetails = async (type) => {
  totalType.value = type;
}

</script>

<template>
  <v-row>
    <v-col
      cols="12"
      sm="5"
      md="5"
    >
      <h3>Totals</h3>

      <v-table density="compact">
        <thead>
          <tr>
            <th>Identifier</th>
            <th>Totals</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Total Guest:</th>
            <td>{{ totalGuest }}</td>
            <td>
              <v-btn
                :disabled="loadingDetails"
                :loading="loadingDetails"
                class="text-none"
                color="indigo-darken-3"
                size="x-small"
                @click="loadDetails('totalGuest')"
              >
                See More
              </v-btn>
            </td>
          </tr>
          <tr>
            <th>Main Guests:</th>
            <td>{{ mainGuests }}</td>
            <td>
              <v-btn
                :disabled="loadingDetails"
                :loading="loadingDetails"
                class="text-none"
                color="indigo-darken-3"
                size="x-small"
                @click="loadDetails('mainGuests')"
              >
                See More
              </v-btn>
            </td>
          </tr>
          <tr>
            <th>Party Members:</th>
            <td>{{ partyMembers }}</td>
            <td>
              <v-btn
                :disabled="loadingDetails"
                :loading="loadingDetails"
                class="text-none"
                color="indigo-darken-3"
                size="x-small"
                @click="loadDetails('partyMembers')"
              >
                See More
              </v-btn>
            </td>
          </tr>
          <tr>
            <th>Total Confirmed:</th>
            <td>{{ totalConfirmed }}</td>
            <td>
              <v-btn
                :disabled="loadingDetails"
                :loading="loadingDetails"
                class="text-none"
                color="indigo-darken-3"
                size="x-small"
                @click="loadDetails('totalConfirmed')"
              >
                See More
              </v-btn>
            </td>
          </tr>
          <tr>
            <th>Total Unconfirmed:</th>
            <td>{{ totalUnConfirmed }}</td>
            <td>
              <v-btn
                :disabled="loadingDetails"
                :loading="loadingDetails"
                class="text-none"
                color="indigo-darken-3"
                size="x-small"
                @click="loadDetails('totalUnConfirmed')"
              >
                See More
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-col>
    <v-col
      cols="12"
      sm="7"
      md="7"
    >
      <h3>Details</h3>

      <v-alert
        type="info"
        v-if="!totalType"
      >
        There is no totals selected yet, please click in see more and you will be able to see the details
      </v-alert>

      <total-guests-table
        v-if="totalType === 'totalGuest'"
        :totalType="'totalGuest'"
      />

      <main-guests-table
        v-if="totalType === 'mainGuests'"
        :totalType="'mainGuests'"
      />

      <party-members-table
        v-if="totalType === 'partyMembers'"
        :totalType="'partyMembers'"
      />

      <total-confirmed-table
        v-if="totalType === 'totalConfirmed'"
        :totalType="'totalConfirmed'"
      />

      <total-un-confirmed-table
        v-if="totalType === 'totalUnConfirmed'"
        :totalType="'totalUnConfirmed'"
      />
    </v-col>
  </v-row>
</template>

<style scoped>

</style>
