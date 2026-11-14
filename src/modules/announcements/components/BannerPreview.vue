<script setup lang="ts">
import { computed } from 'vue'
import { levelView } from '../logic'
import type { BannerPreview } from '../logic'

/**
 * The banner as the organizer sees it in the app: level colour and icon, title, body, optional button and close.
 * Everything is plain text (interpolation only, never v-html); line breaks of the body are kept.
 */
const props = defineProps<{ banner: BannerPreview }>()
const level = computed(() => levelView(props.banner.level))
</script>

<template>
  <div class="banner" :class="`banner--${banner.level}`" role="note" :data-level="banner.level" :style="{ '--tone': `var(--v-theme-${level.color})`, '--on': `var(--v-theme-on-${level.color})` }">
    <v-icon :icon="level.icon" class="banner__icon" size="22" />
    <div class="banner__text">
      <p class="banner__title">{{ banner.title || '…' }}</p>
      <p v-if="banner.body" class="banner__body">{{ banner.body }}</p>
      <span v-if="banner.ctaLabel" class="banner__cta">{{ banner.ctaLabel }}</span>
    </div>
    <span v-if="banner.dismissible" class="banner__close" aria-hidden="true" data-close><v-icon icon="mdi-close" size="18" /></span>
  </div>
</template>

<style scoped>
.banner { display: flex; align-items: flex-start; gap: 12px; padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(var(--tone), 0.35); border-left-width: 5px; background: rgba(var(--tone), 0.1); min-width: 0; }
.banner__icon { color: rgb(var(--tone)); margin-top: 1px; flex: none; }
.banner__text { flex: 1; min-width: 0; }
.banner__title { margin: 0; font-weight: 700; overflow-wrap: anywhere; }
.banner__body { margin: 4px 0 0; white-space: pre-line; overflow-wrap: anywhere; font-size: 0.9375rem; }
.banner__cta { display: inline-flex; align-items: center; min-height: 36px; margin-top: 8px; padding: 0 14px; border-radius: 999px; font-weight: 600; font-size: 0.875rem; background: rgb(var(--tone)); color: rgb(var(--on)); overflow-wrap: anywhere; }
.banner__close { flex: none; display: inline-flex; padding: 2px; color: var(--ink-500); }
</style>
