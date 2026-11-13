<script setup lang="ts">
import { useAppStore } from "@/store/app";
const store = useAppStore()
</script>

<template>
  <span class="logo">
    <svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#b04a62" />
      <text x="20" y="28.5" text-anchor="middle" font-size="26" font-weight="500" fill="#fff">Q</text>
      <circle cx="31" cy="9" r="3" fill="#e6cf93" />
    </svg>
    <span class="logo__name">Quinvite</span>
    <span v-if="store.developmentMode" class="logo__env">dev</span>
  </span>
</template>

<style scoped>
.logo { display: inline-flex; align-items: center; gap: 10px; }
.logo__mark { width: 36px; height: 36px; font-family: var(--font-heading); }
.logo__name { font-family: var(--font-heading); font-size: 1.5rem; font-weight: 500; color: var(--ink-900); }
.logo__env { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #7a5c1e; background: #f6ecd4; border-radius: 6px; padding: 2px 6px; }
</style>
