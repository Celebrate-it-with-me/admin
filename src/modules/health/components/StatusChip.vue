<script setup lang="ts">
import { PROBE_COLOR, PROBE_ICON } from '../logic'
import type { Probe } from '../types'

defineProps<{ status: Probe; text: string }>()
</script>

<template>
  <v-chip :color="PROBE_COLOR[status]" variant="tonal" size="small" :prepend-icon="PROBE_ICON[status]" class="font-weight-bold">{{ text }}</v-chip>
</template>
