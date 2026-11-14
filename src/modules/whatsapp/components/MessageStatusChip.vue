<script setup lang="ts">
import { computed } from 'vue'
import type { MessageStatus, TemplateStatus } from '../types'
import { messageChip, TEMPLATE_STATUS, UNKNOWN_DELIVERY_CHIP } from '../logic'

/** Status as a chip with an icon, so colour is never the only signal. */
const props = defineProps<{ kind: 'message' | 'template'; status: MessageStatus | TemplateStatus; errorCode?: string | null }>()
const view = computed(() => (props.kind === 'message'
  ? messageChip({ status: props.status as MessageStatus, errorCode: props.errorCode ?? null })
  : TEMPLATE_STATUS[props.status as TemplateStatus]))
</script>

<template>
  <v-chip v-if="view" :color="view.color" variant="tonal" size="small" :prepend-icon="view.icon" :data-status="status" :data-unknown="view === UNKNOWN_DELIVERY_CHIP ? 'true' : undefined">{{ view.label }}</v-chip>
</template>
