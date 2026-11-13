<script setup lang="ts">
import { computed } from 'vue'
import type { ModerationItem } from '../types'
import { itemKey, statusInfo } from '../logic'

const props = defineProps<{ item: ModerationItem; selected: boolean; busy: boolean; canModerate: boolean }>()
const emit = defineEmits<{ select: [boolean]; open: []; hide: []; restore: []; remove: [] }>()

const info = computed(() => statusInfo(props.item))
const isImage = computed(() => props.item.type === 'image')
const created = computed(() => new Date(props.item.createdAt).toLocaleString('es-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }))
const author = computed(() => props.item.author?.name ?? (isImage.value ? 'Foto sin autoría' : 'Sin autora'))
const label = computed(() => (isImage.value ? 'foto' : 'comentario') + ` de ${props.item.event.name}`)
const isHidden = computed(() => props.item.status === 'hidden')
</script>

<template>
  <v-card class="card" :class="{ 'is-selected': selected, 'is-busy': busy }" :data-key="itemKey(item)" :aria-busy="busy">
    <button v-if="isImage && item.content.thumbnailUrl" type="button" class="thumb" :aria-label="`Ampliar ${label}`" @click="emit('open')">
      <img :src="item.content.thumbnailUrl" :alt="`Foto del evento ${item.event.name}`" loading="lazy" :class="{ 'is-dimmed': isHidden }">
    </button>
    <div v-else-if="isImage" class="thumb thumb--empty"><v-icon icon="mdi-image-off-outline" size="40" /></div>

    <div class="body">
      <div class="top">
        <v-checkbox-btn :model-value="selected" :aria-label="`Seleccionar ${label}`" class="check" @update:model-value="emit('select', Boolean($event))" />
        <v-chip size="small" variant="tonal" :prepend-icon="isImage ? 'mdi-image-outline' : 'mdi-comment-text-outline'">{{ isImage ? 'Foto' : 'Comentario' }}</v-chip>
        <v-chip v-if="item.pinned" size="small" variant="tonal" prepend-icon="mdi-pin-outline">Fijado</v-chip>
      </div>

      <p v-if="!isImage" class="text" :class="{ 'is-dimmed': isHidden }">{{ item.content.text }}</p>

      <p class="meta">
        <router-link :to="`/dashboard/events/${item.event.id}`" class="event">{{ item.event.name }}</router-link>
        <span class="text-medium-emphasis"> · {{ author }}</span>
      </p>
      <p class="meta text-medium-emphasis">{{ created }}</p>

      <div class="status">
        <v-chip :color="info.color" variant="tonal" size="small" :prepend-icon="info.icon">{{ info.label }}</v-chip>
        <span v-if="info.detail" class="text-caption text-medium-emphasis">{{ info.detail }}</span>
      </div>

      <div v-if="canModerate" class="actions">
        <v-btn v-if="isHidden || item.status === 'pending_review'" variant="tonal" size="small" class="act" prepend-icon="mdi-eye-outline" :disabled="busy" @click="emit('restore')">
          {{ isHidden ? 'Restaurar' : 'Aprobar' }}
        </v-btn>
        <v-btn v-if="!isHidden" variant="tonal" size="small" class="act" prepend-icon="mdi-eye-off-outline" :disabled="busy" @click="emit('hide')">Ocultar</v-btn>
        <v-btn variant="text" size="small" color="error" class="act" prepend-icon="mdi-trash-can-outline" :disabled="busy" @click="emit('remove')">Borrar</v-btn>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
.card { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.card.is-selected { outline: 2px solid var(--rose-600); outline-offset: -2px; }
.card.is-busy { opacity: 0.55; }
.thumb { display: block; width: 100%; aspect-ratio: 4 / 3; background: var(--cream-200); border: 0; padding: 0; cursor: zoom-in; overflow: hidden; }
.thumb:focus-visible { outline: 3px solid var(--rose-600); outline-offset: -3px; }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.thumb--empty { display: flex; align-items: center; justify-content: center; color: var(--ink-500); cursor: default; }
.is-dimmed { opacity: 0.5; }
.body { padding: 8px 16px 16px; display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.top { display: flex; align-items: center; gap: 8px; margin-left: -10px; }
.check { flex: none; }
.check :deep(.v-selection-control) { min-height: 44px; }
.text { margin: 4px 0; white-space: pre-wrap; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 6; line-clamp: 6; -webkit-box-orient: vertical; overflow: hidden; }
.meta { margin: 0; font-size: 0.875rem; overflow-wrap: anywhere; }
.event { color: var(--rose-700); font-weight: 600; text-decoration: none; }
.event:hover, .event:focus-visible { text-decoration: underline; }
.status { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; margin-top: 4px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 12px; }
.act { min-height: 44px; }
</style>
