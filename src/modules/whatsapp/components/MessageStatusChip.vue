<script setup lang="ts">
import { computed } from 'vue'
import type { MessageStatus, TemplateStatus } from '../types'
import { MESSAGE_STATUS, TEMPLATE_STATUS } from '../logic'

/** Status as a chip with an icon, so colour is never the only signal. */
const props = defineProps<{ kind: 'message' | 'template'; status: MessageStatus | TemplateStatus }>()
const view = computed(() => (props.kind === 'message' ? MESSAGE_STATUS[props.status as MessageStatus] : TEMPLATE_STATUS[props.status as TemplateStatus]))
</script>

<template>
  <v-chip v-if="view" :color="view.color" variant="tonal" size="small" :prepend-icon="view.icon" :data-status="status">{{ view.label }}</v-chip>
</template>
