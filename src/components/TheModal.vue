<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  openModal: {
    type: Boolean,
    required: false,
    default: false
  },

  title: {
    type: String,
    required: false,
    default: ''
  }
})

const open = ref(false)

watch(() => props.openModal, (value) => {
  open.value = value
})
</script>

<template>
<v-dialog v-model="open" persistent width="1042">
  <v-card>
    <v-card-title>
      <span class="text-h5">
        {{ props.title }}
      </span>
    </v-card-title>
    <v-card-text>
      <slot name="dialogContent"></slot>
    </v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <slot name="dialogFooter"></slot>
    </v-card-actions>
  </v-card>
</v-dialog>
</template>

<style scoped>

</style>
