<script setup>

import {ref, watch} from "vue";
import TheCreateEditGuestModal from "@/components/rsvp/TheCreateEditGuestModal.vue";
import TheSearchInput from "@/components/TheSearchInput.vue";
import TheMainGuestTable from "@/components/rsvp/TheMainGuestTable.vue";
import TheDeleteMainGuestModal from "@/components/rsvp/TheDeleteMainGuestModal.vue";
import TheResetMainGuestCodeModal from "@/components/rsvp/TheResetMainGuestCodeModal.vue";
import TheTotalsTable from "@/components/rsvp/TheTotalsTable.vue";

const showAddEditDialog = ref(false)
const editGuest = ref({})
const searchInput = ref('')
const reloadMG = ref(false)
const selectedItem = ref({})
const deleteModal = ref(false)
const showResetAccessCode = ref(false)
const resetItem = ref({})

const statusItems = ref([
  {
    text: 'Select',
    value: 'select'
  },
  {
    text: 'Yes',
    value: 'yes'
  },
  {
    text: 'No',
    value: 'no'
  },
  {
    text: 'not yet',
    value: 'ny'
  },
])

const statusSelected = ref('select')

watch(statusSelected, () => {
  reloadMG.value = true;
})

const openAddEditDialog = () => {
  showAddEditDialog.value = true;
}

const handleReloadMG = () => {
  editGuest.value = {};
  showAddEditDialog.value = false;
  deleteModal.value = false;
  reloadMG.value = true;
  showResetAccessCode.value = false;
}

const handleEditItem = (item) => {
  editGuest.value = item;
  showAddEditDialog.value = true;
}

const handleDeleteItem = (item) => {
  deleteModal.value = true;
  selectedItem.value = item;
}

const closeDeleteModal = () => {
  deleteModal.value = false;
}

const resetReloadMG = () => {
  reloadMG.value = false;
}

const handleResetCode = (item) => {
  resetItem.value = item
  showResetAccessCode.value = true
}

</script>

<template>
<v-row>
  <v-col>
    <v-btn
      variant="tonal"
      size="x-large"
      :flat="true"
      prepend-icon="mdi-account-plus"
      @click="openAddEditDialog()"
    >
      <template v-slot:prepend>
        <v-icon color="success"></v-icon>
      </template>
      Add Main Guest
    </v-btn>
  </v-col>
  <v-col
    cols="3"
  >
    <v-select
      v-model="statusSelected"
      label="Select Status"
      :items="statusItems"
      item-title="text"
      item-value="value"
    />
  </v-col>
  <v-col
    cols="3"
  >
    <the-search-input @newInput="(val) => (searchInput = val)"></the-search-input>
  </v-col>
  <the-main-guest-table
    :search="searchInput"
    :refresh-table="reloadMG"
    :status-selected="statusSelected"
    @resetReload="resetReloadMG"
    @editingItem="handleEditItem"
    @deletingItem="handleDeleteItem"
    @resetCode="handleResetCode"
  ></the-main-guest-table>

  <the-delete-main-guest-modal
    :selected-item="selectedItem"
    :open-modal="deleteModal"
    @closeModal="closeDeleteModal"
    @reloadMainGuest="handleReloadMG"
  >
  </the-delete-main-guest-modal>

  <the-create-edit-guest-modal
    :edit-guest="editGuest"
    :open-modal="showAddEditDialog"
    @closeModal="showAddEditDialog = false"
    @reloadMainGuest="handleReloadMG"
  />

  <the-reset-main-guest-code-modal
    :selected-item="resetItem"
    :open-modal="showResetAccessCode"
    @closeModal="showResetAccessCode = false"
    @reloadMainGuest="handleReloadMG"
  />
</v-row>
<v-row class="mt-16">
  <v-col>
    <the-totals-table />
  </v-col>
</v-row>
</template>

<style scoped>

</style>
