<script setup>
import { API } from "@/services/axios";

const props = defineProps({
  buttonText: { type: String, required: false, default: 'Export to Excel'},

  buttonColor: { type: String, required: false, default: 'green'},

  buttonSize: { type: String, required: false, default: 'small' },

  downloadUrl: { type: String, required: true},

  fileName: { type: String, required: false, default: 'report.xlsx' }
});

const exportToExcel = async () => {
  const response = await API.get(props.downloadUrl, {
    responseType: 'blob'
  });

  if (response.status >= 200 && response.status < 300) {
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', props.fileName);
    document.body.appendChild(link);
    link.click();
  }
}
</script>

<template>
  <v-row class="mt-3">
    <v-col cols="12" class="d-flex justify-end">
      <v-btn
        :color="buttonColor"
        :size="buttonSize"
        @click="exportToExcel()"
      >
        {{ buttonText }}
      </v-btn>
    </v-col>
  </v-row>
</template>

<style scoped>

</style>
