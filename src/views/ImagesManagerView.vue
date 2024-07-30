<script setup>
import {computed, onMounted, ref, watch} from "vue";
import {API} from "@/services/axios";

const folders = ref([])
const loading = ref(false)
const foldersError = ref(false)
const folderSelected = ref(null)
const loadingObjects = ref(false)
const objectsByFolder = ref([])
const objectsKey = ref([])
const objectsError = ref(false)
const downloadingFile = ref(false)
const deletingFile = ref(false)

const ableToLoadObjects = computed(() => {
  return folderSelected.value;
})

onMounted(() => {
  getUsernameFolders();
})

const getUsernameFolders = async () => {
  loading.value = true;

  try {
    const response = await API.get('username-folders');

    if (response.status === 200 ) {
      folders.value = response.data?.folders ?? [];
    } else {
      console.error(response);
      foldersError.value = true;
    }
  } catch (error) {
    console.error(error);
    foldersError.value = true;
  } finally {
    loading.value = false;
  }
}



const loadObjects = async () => {
  loadingObjects.value = true;

  try {
    const response = await API.get(`folder-objects/${folderSelected.value}`);

    if (response.status === 200) {
      objectsByFolder.value = response.data?.result ?? {};

      if (Object.keys(objectsByFolder.value).length) {
        for (let key in objectsByFolder.value) {
          if (objectsByFolder.value.hasOwnProperty(key)) {
            console.log(key);
            objectsKey.value.push(key);
          }
        }
      }

    } else {
      objectsError.value = true
    }

  } catch (error) {
    console.error(error)
    objectsError.value = true
  } finally {
    loadingObjects.value = false;
  }
}

watch(folderSelected, () => {
  objectsByFolder.value = [];
  objectsKey.value = [];
})

const downloadFile = async (item) => {
  try {
    downloadingFile.value = true;

    const response = await API.get(`download-file/${folderSelected.value}/${item}`);

    if (response.status === 200) {
      let fileUrl = response.data.fileUrl;

      window.error(fileUrl, '_blank');
    } else {
      console.error(respose);
    }
  } catch (e) {
    console.log(e);
  } finally {
    downloadingFile.value = false;
  }
}

const deleteFile = async (item) => {
  try {
    deletingFile.value = true;

    const response = await API.get(`delete-file/${folderSelected.value}/${item}`);

    if (response.status === 200) {
      await loadObjects();
    } else {
      console.error(response)
    }

  } catch (e) {
    console.error(e)
  } finally {
    deletingFile.value = false;
  }
}

</script>

<template>
  <v-container>
    <v-row v-if="loading">
      <v-col>
        Loading Folders...
      </v-col>
    </v-row>
    <v-row v-else-if="foldersError">
      <v-col
        v-if="foldersError"
        cols="12"
        sm="12"
        md="12"
      >
        <v-alert
          text="Ops, something happens loading the username folders!"
          title="Server Error"
          type="error"
        ></v-alert>
      </v-col>
    </v-row>
    <v-row v-else>
      <v-col
        cols="12"
        sm="4"
        md="4"
        class="flex flex-column justify-end"
      >
        <h3>Please select an username</h3>

        <v-select
          v-model="folderSelected"
          label="Username Folder"
          :items="folders"
        ></v-select>

        <v-btn
          class="custom-button"
          :disabled="!ableToLoadObjects || loadingObjects"
          :loading="loadingObjects"
          @click="loadObjects"
        >
          Load Objects
        </v-btn>
      </v-col>
      <v-col
        v-if="objectsKey.length && folderSelected"
        cols="12"
        sm="8"
        md="8"
      >
        <h3>
          Objects in {{ folderSelected }} Folder

          <v-btn
            class="delete-custom-button"
          >
            Delete Folder
          </v-btn>
        </h3>

        <v-table>
          <thead>
          <tr>
            <th class="text-left">
              Key Name
            </th>
            <th class="text-left">
              Actions
            </th>
          </tr>
          </thead>
          <tbody>
          <tr
            v-for="(item, index) in objectsKey"
            :key="index"
          >
            <td>{{ item }}</td>
            <td>
              <v-btn
                :loading="downloadingFile"
                :disabled="downloadingFile"
                class="download-custom-button mr-2"
                @click="downloadFile(item)"
              >
                Download
              </v-btn>
              <v-btn
                class="delete-custom-button"
                @click="deleteFile(item)"
              >
                Delete
              </v-btn>
            </td>
          </tr>
          </tbody>
        </v-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.custom-button {
  background-color: rgb(9, 32, 63) !important;
  color: white !important;
}

.delete-custom-button {
  background-color: rgba(187, 13, 0, 0.82) !important;
  color: white !important;
}

.download-custom-button {
  background-color: rgb(9, 32, 63) !important;
  color: white !important;
}

</style>
