<script setup lang="ts">
import { computed, watch } from 'vue'
import type { ModerationItem } from '../types'
import { statusInfo } from '../logic'

const props = defineProps<{ modelValue: boolean; photos: ModerationItem[]; index: number }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; 'update:index': [number] }>()

const current = computed(() => props.photos[props.index] ?? null)
const info = computed(() => (current.value ? statusInfo(current.value) : null))
const go = (step: number) => {
  const n = props.index + step
  if (n >= 0 && n < props.photos.length) emit('update:index', n)
}
const close = () => emit('update:modelValue', false)

const onKey = (e: KeyboardEvent) => {
  if (!props.modelValue) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
  else if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
  else if (e.key === 'Escape') { e.preventDefault(); close() }
}
watch(() => props.modelValue, open => {
  if (open) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
}, { immediate: true })
</script>

<template>
  <v-dialog :model-value="modelValue" fullscreen scrim="#1c1714" @update:model-value="emit('update:modelValue', $event)">
    <div v-if="current" class="viewer" role="dialog" aria-modal="true" aria-label="Foto ampliada">
      <header class="bar">
        <div class="who">
          <strong>{{ current.event.name }}</strong>
          <span v-if="info" class="chip">{{ info.label }}</span>
          <span class="count" aria-live="polite">{{ index + 1 }} de {{ photos.length }}</span>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" aria-label="Cerrar (Esc)" class="close" @click="close" />
      </header>
      <div class="stage">
        <v-btn icon="mdi-chevron-left" variant="flat" class="nav nav--prev" aria-label="Foto anterior (flecha izquierda)" :disabled="index === 0" @click="go(-1)" />
        <img :src="current.content.imageUrl ?? current.content.thumbnailUrl ?? ''" :alt="`Foto del evento ${current.event.name}`">
        <v-btn icon="mdi-chevron-right" variant="flat" class="nav nav--next" aria-label="Foto siguiente (flecha derecha)" :disabled="index >= photos.length - 1" @click="go(1)" />
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.viewer { background: #1c1714; color: #fff; height: 100%; display: flex; flex-direction: column; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 8px 8px 16px; }
.who { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; min-width: 0; }
.chip { font-size: 0.75rem; background: rgba(255, 255, 255, 0.16); padding: 2px 10px; border-radius: 999px; }
.count { font-size: 0.875rem; opacity: 0.8; }
.close { width: 44px; height: 44px; }
.stage { position: relative; flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 8px 16px; }
.stage img { max-width: 100%; max-height: 100%; object-fit: contain; }
.nav { position: absolute; top: 50%; transform: translateY(-50%); width: 44px; height: 44px; background: rgba(255, 255, 255, 0.85); color: var(--ink-900); }
.nav--prev { left: 8px; }
.nav--next { right: 8px; }
</style>
