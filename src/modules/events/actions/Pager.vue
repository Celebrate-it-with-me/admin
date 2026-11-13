<script setup lang="ts">
import type { Meta } from './api'

defineProps<{ meta: Meta | null; disabled?: boolean }>()
defineEmits<{ page: [number] }>()
</script>

<template>
  <nav v-if="meta && meta.lastPage > 1" class="pager" aria-label="Paginación">
    <v-btn variant="text" :disabled="disabled || meta.page <= 1" prepend-icon="mdi-chevron-left" class="btn" @click="$emit('page', meta.page - 1)">Anterior</v-btn>
    <span class="text-body-2" aria-live="polite">Página {{ meta.page }} de {{ meta.lastPage }} · {{ meta.total }} en total</span>
    <v-btn variant="text" :disabled="disabled || meta.page >= meta.lastPage" append-icon="mdi-chevron-right" class="btn" @click="$emit('page', meta.page + 1)">Siguiente</v-btn>
  </nav>
</template>

<style scoped>
.pager { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.btn { min-height: 44px; }
</style>
