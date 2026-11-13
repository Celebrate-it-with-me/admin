<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  icon: string
  loading: boolean
  failed: boolean
  /** There is something to show (so a reload dims it instead of showing the skeleton). */
  ready: boolean
  errorText: string
}>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <v-card class="hcard pa-4 pa-sm-5" :aria-busy="loading" :aria-labelledby="`h-${title}`">
    <header class="hcard__head">
      <v-icon :icon="icon" size="22" class="hcard__icon" aria-hidden="true" />
      <div class="hcard__titles">
        <h3 :id="`h-${title}`" class="hcard__title">{{ title }}</h3>
        <p v-if="subtitle" class="hcard__sub">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>

    <v-alert v-if="failed" type="error" variant="tonal" density="comfortable" class="mb-3" :text="errorText">
      <template #append><v-btn variant="text" class="touch" @click="$emit('retry')">Reintentar</v-btn></template>
    </v-alert>

    <div v-if="!ready && loading" aria-hidden="true">
      <v-skeleton-loader type="heading, text, text" class="hcard__skeleton" />
    </div>
    <div v-else-if="ready" :class="{ 'is-loading': loading }">
      <slot />
    </div>
  </v-card>
</template>

<style scoped>
.hcard__head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.hcard__icon { color: var(--rose-600); margin-top: 4px; }
.hcard__titles { flex: 1; min-width: 0; }
.hcard__title { font-family: var(--font-heading); font-size: 1.25rem; line-height: 1.3; margin: 0; }
.hcard__sub { font-size: 0.8125rem; color: var(--ink-500); margin: 2px 0 0; }
.hcard__skeleton { background: transparent; margin: 0 -16px; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.touch { min-height: 44px; }
</style>
