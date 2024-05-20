<script setup >
import {ref} from "vue";

const props = defineProps({
  guest: {
    type: Object,
    required: true
  }
})

const isOpen = ref(false)
</script>

<template>
  <tr
    :class="{'is-main': guest.isMain === 'yes', 'is-member': guest.isMain === 'no' }"
    @click="isOpen = !isOpen"
  >
    <td>{{ guest.name }}</td>
    <td>{{ guest.isMain }}</td>
    <td>{{ guest.confirmed }}</td>
    <td>{{ guest.phoneNumber }}</td>
  </tr>
  <tr v-if="isOpen && guest.partyMembers.length">
    <td colspan="4">
      <v-table density="compact">
        <thead>
          <tr>
            <th>Name</th>
            <th>Confirmed</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(member,index) in guest.partyMembers"
            :key="index"
          >
            <td>{{ member.name }}</td>
            <td>{{ member.confirmed }}</td>
          </tr>
        </tbody>
      </v-table>
    </td>
  </tr>
</template>

<style scoped>
.is-main {
  background-color: #1c9177;
  color: white;
}
</style>
