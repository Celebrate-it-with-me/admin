<script setup lang="ts">
import { STATUS_COLOR, STATUS_LABEL } from '../logic'
import type { VersionStatus } from '../types'

defineProps<{ status: VersionStatus }>()
</script>

<template>
  <v-chip size="small" variant="tonal" :color="STATUS_COLOR[status]">{{ STATUS_LABEL[status] }}</v-chip>
</template>
