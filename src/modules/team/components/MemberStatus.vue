<script setup lang="ts">
import { computed } from 'vue'
import type { Member } from '../types'
import { statusView } from '../logic'

const props = defineProps<{ member: Pick<Member, 'status' | 'invitation'> }>()
const view = computed(() => statusView(props.member))
</script>

<template>
  <div class="status">
    <v-chip :color="view.color" variant="tonal" size="small" :prepend-icon="view.icon">{{ view.label }}</v-chip>
    <span v-if="view.note" class="status__note" :class="{ 'status__note--error': view.noteTone === 'error' }">{{ view.note }}</span>
  </div>
</template>

<style scoped>
.status { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
.status__note { font-size: 0.75rem; color: var(--ink-500); padding-left: 4px; }
.status__note--error { color: rgb(var(--v-theme-error)); font-weight: 600; }
</style>
