<script setup lang="ts">
import type { ActionKey, MemberAction } from '../types'

defineProps<{ name: string; actions: MemberAction[] }>()
defineEmits<{ pick: [ActionKey] }>()
</script>

<template>
  <v-menu location="bottom end">
    <template #activator="{ props: activator }">
      <v-btn v-bind="activator" icon="mdi-dots-vertical" variant="text" class="touch" :aria-label="`Acciones de ${name}`" />
    </template>
    <v-list density="comfortable" min-width="248">
      <v-list-item
        v-for="a in actions"
        :key="a.key"
        :prepend-icon="a.icon"
        :title="a.label"
        :subtitle="a.hint"
        :disabled="a.disabled"
        :base-color="a.danger ? 'error' : undefined"
        @click="$emit('pick', a.key)"
      />
    </v-list>
  </v-menu>
</template>

<style scoped>
.touch { min-width: 44px; min-height: 44px; }
</style>
