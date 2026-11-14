<script setup lang="ts">
import type { StaffRole } from '@/types'
import { ROLE_OPTIONS } from '../logic'

defineProps<{ modelValue: StaffRole; label?: string }>()
defineEmits<{ 'update:modelValue': [StaffRole] }>()
</script>

<template>
  <v-radio-group :model-value="modelValue" :label="label ?? 'Rol'" class="role-field" hide-details @update:model-value="$emit('update:modelValue', $event as StaffRole)">
    <v-radio v-for="r in ROLE_OPTIONS" :key="r.value" :value="r.value" class="role-field__option">
      <template #label>
        <span class="role-field__text">
          <strong>{{ r.title }}</strong>
          <span class="role-field__sub">{{ r.subtitle }}</span>
        </span>
      </template>
    </v-radio>
  </v-radio-group>
</template>

<style scoped>
.role-field { margin-bottom: 12px; }
.role-field__option { align-items: flex-start; padding-block: 4px; }
.role-field__text { display: flex; flex-direction: column; gap: 2px; padding-top: 2px; opacity: 1; }
.role-field__sub { font-size: 0.8125rem; line-height: 1.35; color: var(--ink-500); white-space: normal; }
</style>
