<script setup>

import {ref} from "vue";
import TheCreateEditGuestModal from "@/components/rsvp/TheCreateEditGuestModal.vue";
import TheSearchInput from "@/components/TheSearchInput.vue";
import TheMainGuestTable from "@/components/rsvp/TheMainGuestTable.vue";
import TheDeleteMainGuestModal from "@/components/rsvp/TheDeleteMainGuestModal.vue";

const showAddEditDialog = ref(false)
const editGuest = ref({})
const searchInput = ref('')
const reloadMG = ref(false)
const selectedItem = ref({})
const deleteModal = ref(false)

const openAddEditDialog = () => {
  showAddEditDialog.value = true;
}

const handleReloadMG = () => {
  showAddEditDialog.value = false;
  deleteModal.value = false;
  reloadMG.value = true;
}

const handleEditItem = (item) => {
  editGuest.value = item
  showAddEditDialog.value = true
}

const handleDeleteItem = (item) => {
  deleteModal.value = true
  selectedItem.value = item
}

const closeDeleteModal = () => {
  deleteModal.value = false
}

const resetReloadMG = () => {
  reloadMG.value = false;
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
    <the-search-input @newInput="(val) => (searchInput.value = val)"></the-search-input>
  </v-col>
  <the-main-guest-table
    :search="searchInput"
    :refresh-table="reloadMG"
    @resetReload="resetReloadMG"
    @editingItem="handleEditItem"
    @deletingItem="handleDeleteItem"
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
</v-row>
</template>

<style scoped>

</style>
