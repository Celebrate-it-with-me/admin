<script setup lang="ts">
import type { EventDetail } from '../types'

// Receives the loaded event; emits `reload` after a change so the sheet refreshes.
defineProps<{ detail: EventDetail }>()
defineEmits<{ reload: [] }>()
</script>

<template>
  <v-card class="pa-6 text-center">
    <v-chip color="warning" variant="tonal" size="small" prepend-icon="mdi-hammer-wrench" class="mb-3">En construcción</v-chip>
    <p class="text-medium-emphasis">Esta pestaña está en desarrollo.</p>
  </v-card>
</template>
