<script setup lang="ts">
import { PLAN_COLOR, STAGE, STATUS, purchaseTone } from '../labels'
import type { EventStage, EventStatus } from '../types'

defineProps<{
  status?: EventStatus
  stage?: EventStage
  plan?: { slug: string; name: string } | null
  purchase?: string | null
}>()
</script>

<template>
  <span class="chips">
    <v-chip v-if="status" :color="STATUS[status].color" variant="tonal" size="small" :prepend-icon="STATUS[status].icon">{{ STATUS[status].label }}</v-chip>
    <v-chip v-if="stage" :color="STAGE[stage].color" variant="tonal" size="small" :prepend-icon="STAGE[stage].icon">{{ STAGE[stage].label }}</v-chip>
    <v-chip v-if="plan" :color="PLAN_COLOR[plan.slug] ?? 'secondary'" variant="tonal" size="small">{{ plan.name }}</v-chip>
    <v-chip v-if="purchaseTone(purchase ?? null)" :color="purchaseTone(purchase ?? null)!.color" variant="tonal" size="small" :prepend-icon="purchaseTone(purchase ?? null)!.icon">{{ purchaseTone(purchase ?? null)!.label }}</v-chip>
  </span>
</template>

<style scoped>
.chips { display: inline-flex; flex-wrap: wrap; gap: 6px; align-items: center; }
</style>
