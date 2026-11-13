<script setup lang="ts">
import type { EventDetail } from '../types'

// Filled in by the next wave. Receives the loaded event; emits `reload` after a change so the sheet refreshes.
defineProps<{ detail: EventDetail }>()
defineEmits<{ reload: [] }>()
</script>

<template>
  <div />
</template>
