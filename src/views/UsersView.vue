<script setup lang="ts">
import { ref } from "vue";
import TheSearchInput from "@/components/TheSearchInput.vue";
import TheUserTable from "@/components/users/TheUserTable.vue";
import TheCreateEditUserModal from "@/components/users/TheCreateEditUserModal.vue";
import TheDeleteUserModal from "@/components/users/TheDeleteUserModal.vue";

const addEditDialog = ref(false)
const searchInput = ref('')
const reloadUser = ref(false)
const editItem = ref({})
const selectedItem = ref({})
const deleteModal = ref(false)



const openAddEditDialog = () => {
  addEditDialog.value = true;
}

const handleCloseModal = () => {
  addEditDialog.value = false
}

const toggleReloadUser = () => {
  addEditDialog.value = false
  deleteModal.value = false
  reloadUser.value = !reloadUser.value
}

const handleEditItem = (item) => {
  editItem.value = item
  addEditDialog.value = true
}

const handleDeleteItem = (item) => {
  deleteModal.value = true
  selectedItem.value = item
}

const closeDeleteModal = (item) => {
  deleteModal.value = false
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
        AddUser
      </v-btn>
    </v-col>
    <v-col cols="3">
      <the-search-input @newInput="(val) => (searchInput = val)"></the-search-input>
    </v-col>
    <the-user-table
      :search="searchInput"
      :refresh-table="reloadUser"
      @resetReload="toggleReloadUser"
      @editingItem="handleEditItem"
      @deletingItem="handleDeleteItem"
    />

    <the-delete-user-modal
      :selected-item="selectedItem"
      :open-modal="deleteModal"
      @closeModal="closeDeleteModal"
      @reloadUser="toggleReloadUser"
    />
    <the-create-edit-user-modal
      :edit-item="editItem"
      :open-modal="addEditDialog"
      @closeModal="handleCloseModal"
      @reloadUser="toggleReloadUser"
    ></the-create-edit-user-modal>
  </v-row>
</template>

<style scoped>

</style>
