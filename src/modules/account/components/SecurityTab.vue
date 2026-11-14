<script setup lang="ts">
import type { AccountProfile } from '../types'
import PasswordCard from './PasswordCard.vue'
import TwoFactorCard from './TwoFactorCard.vue'

defineProps<{ profile: AccountProfile }>()
defineEmits<{ refresh: [] }>()
</script>

<template>
  <div class="stack">
    <password-card @changed="$emit('refresh')" />
    <two-factor-card :status="profile.twoFactor" :email="profile.email" @changed="$emit('refresh')" />
  </div>
</template>

<style scoped>
.stack { display: grid; gap: 16px; max-width: 720px; }
</style>
