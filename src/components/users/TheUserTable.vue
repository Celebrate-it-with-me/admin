<script setup lang="ts">
import {ref, watch} from 'vue'
import { API } from '@/services/axios'

const props = defineProps({
  searchInput: {
    type: String,
    required: false,
    default: ''
  },

  refreshTable: {
    type: Boolean,
    required: false,
    default: false
  },
})

const emit = defineEmits(['resetReload', 'editingItem', 'deletingItem'])
const users = ref()
const loading = ref(false)
const total = ref(0)
const params = ref({})

const headers = [
  { key: 'id', title: 'ID', value: 'id', sortable: false },
  { key: 'name', title: 'Name', value: 'name', sortable: false },
  { key: 'email', title: 'Email', value: 'email', sortable: false },
  { key: 'created_at', title: 'Created', value: 'created_at', sortable: false },
  { key: 'actions', title: 'Actions', value: '', sortable: false }
]

const dataTableItemsPerPage = [
  { value: 10,title: '10' },
  { value: 25,title: '25' },
  { value: 50,title: '50' },
  { value: 100,title: '100' },
]

watch(() => props.refreshTable, (value) => {
  if (value) {
    getUsers()
  }
})

watch(params, () => {
  getUsers()
},
  {
    deep: true
  }
)

const getUsers = async () => {
  loading.value = true
  try {
    const response = await API.get('users', {
      params: params.value
    })

    users.value = response.data?.data ?? []
    total.value = response.data?.meta?.total ?? 0

    emit('resetReload')

  } catch (err) {
    console.log(e)
  } finally {
    loading.value = false
  }
}

const handleEditItem = (item) => {
  emit('editingItem', item)
}

const handleDeleteItem = (item) => {
  emit('deletingItem', item)
}

</script>

<template>
  <v-data-table-server
    :loading="loading"
    :headers="headers"
    :items="users"
    :items-length="total"
    :search="searchInput"
    :items-per-page-options="dataTableItemsPerPage"
    @update:options="(n) => (params = n)"
  >
    <template v-slot:item.actions="{ item }">
      <v-icon
        icon="mdi-square-edit-outline"
        @click="handleEditItem(item)"
      ></v-icon>
      <v-icon
        icon="mdi-delete-outline"
        @click="handleDeleteItem(item)"
      ></v-icon>
    </template>
  </v-data-table-server>
</template>

<style scoped>

</style>
