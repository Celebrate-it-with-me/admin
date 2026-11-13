<script setup lang="ts">
import type { UserItem } from "@/types"
import { ref } from "vue";
import { useCurrentUserStore } from "@/store/currentUser";
import TheSearchInput from "@/components/TheSearchInput.vue";
import TheUserTable from "@/components/users/TheUserTable.vue";
import TheCreateEditUserModal from "@/components/users/TheCreateEditUserModal.vue";
import TheDeleteUserModal from "@/components/users/TheDeleteUserModal.vue";

const currentUser = useCurrentUserStore()
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

const handleEditItem = (item: UserItem) => {
  editItem.value = item
  addEditDialog.value = true
}

const handleDeleteItem = (item: UserItem) => {
  deleteModal.value = true
  selectedItem.value = item
}

const closeDeleteModal = () => {
  deleteModal.value = false
}
</script>

<template>
  <v-row>
    <v-col>
      <v-btn
        v-if="currentUser.can('admin.users.manage')"
        color="primary"
        prepend-icon="mdi-account-plus"
        @click="openAddEditDialog()"
      >
        Nuevo usuario
      </v-btn>
    </v-col>
    <v-col cols="12" sm="6" md="4">
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
