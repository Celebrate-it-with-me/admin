<script setup lang="ts">
import type { PreviewState } from '../composables'
import type { MessagePreview } from '../types'

/**
 * The email as it will arrive, rendered by the API from the texts being edited. The HTML goes in an `iframe` with an
 * empty `sandbox` (no scripts, no forms, no same-origin) through `srcdoc`; it is never put in the page with v-html.
 */
defineProps<{ preview: MessagePreview | null; state: PreviewState }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="mail" :aria-busy="state === 'loading'" data-preview>
    <p class="mail__status" role="status" aria-live="polite">
      <template v-if="state === 'loading'"><v-progress-circular indeterminate size="14" width="2" class="mr-2" />Actualizando la vista previa…</template>
      <template v-else-if="state === 'invalid'"><v-icon icon="mdi-alert-circle-outline" size="16" color="warning" class="mr-1" />Corrige los textos marcados para ver la vista previa al día.</template>
      <template v-else-if="state === 'error'">
        <v-icon icon="mdi-alert-circle-outline" size="16" color="error" class="mr-1" />No pudimos generar la vista previa.
        <v-btn variant="text" size="small" @click="$emit('retry')">Reintentar</v-btn>
      </template>
    </p>
    <template v-if="preview">
      <dl class="mail__head" :class="{ 'is-stale': state !== 'ready' }">
        <dt>Asunto</dt><dd data-subject>{{ preview.subject }}</dd>
        <template v-if="preview.preheader"><dt>Texto previo</dt><dd>{{ preview.preheader }}</dd></template>
      </dl>
      <iframe class="mail__frame" :class="{ 'is-stale': state !== 'ready' }" sandbox="" :srcdoc="preview.html" title="Vista previa del correo" referrerpolicy="no-referrer" />
    </template>
    <v-skeleton-loader v-else-if="state === 'loading'" type="article" />
  </div>
</template>

<style scoped>
.mail__status { min-height: 24px; margin: 0 0 6px; font-size: 0.8125rem; color: var(--ink-500); display: flex; align-items: center; flex-wrap: wrap; }
.mail__head { display: grid; grid-template-columns: auto 1fr; gap: 2px 12px; margin: 0 0 10px; font-size: 0.875rem; }
.mail__head dt { color: var(--ink-500); }
.mail__head dd { margin: 0; overflow-wrap: anywhere; font-weight: 500; }
.mail__frame { display: block; width: 100%; height: 480px; border: 1px solid rgb(var(--v-theme-on-surface), 0.15); border-radius: 8px; background: #fff; transition: opacity 0.15s ease-out; }
.is-stale { opacity: 0.5; }
</style>
