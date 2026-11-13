<script setup lang="ts">
defineProps<{
  title: string
  icon: string
  description: string
  consequence?: string
  button: string
  danger?: boolean
  disabled?: boolean
  note?: string
}>()
defineEmits<{ run: [] }>()
</script>

<template>
  <v-card class="pa-5 card h-100">
    <div class="head">
      <v-icon :icon="icon" :color="danger ? 'error' : 'primary'" aria-hidden="true" />
      <h3 class="text-h6">{{ title }}</h3>
    </div>
    <p class="mt-2">{{ description }}</p>
    <p v-if="consequence" class="text-body-2 text-medium-emphasis mt-1">{{ consequence }}</p>
    <slot />
    <div class="foot">
      <v-btn :color="danger ? 'error' : 'primary'" variant="tonal" :disabled="disabled" class="btn" @click="$emit('run')">{{ button }}</v-btn>
      <p v-if="note" class="text-caption text-medium-emphasis mt-2">{{ note }}</p>
    </div>
  </v-card>
</template>

<style scoped>
.card { display: flex; flex-direction: column; }
.head { display: flex; align-items: center; gap: 10px; }
.foot { margin-top: auto; padding-top: 16px; }
.btn { min-height: 44px; }
</style>
