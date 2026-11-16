<script setup lang="ts">
import { STATUS_COLOR, STATUS_ICON, STATUS_LABEL } from '../logic'
import type { PackageStatus } from '../types'

defineProps<{ status: PackageStatus }>()
</script>

<template>
  <v-chip size="small" variant="tonal" :color="STATUS_COLOR[status]" :prepend-icon="STATUS_ICON[status]" :data-status="status">{{ STATUS_LABEL[status] }}</v-chip>
</template>
