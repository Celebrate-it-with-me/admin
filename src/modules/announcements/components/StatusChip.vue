<script setup lang="ts">
import { computed } from 'vue'
import { STATUS_VIEWS } from '../logic'
import type { AnnouncementStatus } from '../types'

const props = defineProps<{ status: AnnouncementStatus }>()
const view = computed(() => STATUS_VIEWS[props.status])
</script>

<template>
  <v-chip :color="view.color" variant="tonal" size="small" :prepend-icon="view.icon" :data-status="status">{{ view.label }}</v-chip>
</template>
