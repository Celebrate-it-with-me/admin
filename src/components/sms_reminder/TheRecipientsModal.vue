<script setup lang="ts">
import TheModal from "@/components/TheModal.vue"

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

const emit = defineEmits(['closeModal'])
const modalTitle = 'All Recipients'

const handleClose = () => {
  emit('closeModal');
}

</script>

<template>
  <v-row justify="center">
    <the-modal :open-modal="props.openModal" :title="modalTitle">
      <template v-slot:dialogContent>
        <v-table>
          <thead>
            <tr>
              <th>
                Name
              </th>
              <th>
                Phone Number
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in selectedItem" :key="item.phoneNumber">
              <td>{{ item.name }}</td>
              <td>{{ item.phoneNumber }}</td>
            </tr>
          </tbody>
        </v-table>
      </template>
      <template v-slot:dialogFooter>
        <v-btn
          color="blue-darken-1"
          variant="text"
          @click="handleClose()"
        >
          Close
        </v-btn>
      </template>
    </the-modal>
  </v-row>
</template>

<style scoped>

</style>
