<script setup lang="ts">
import type { ThirdPartyMark } from '../types'

/** Warning about trademarks of other companies declared in the package (spec §6c). Shown in the report, the detail and the activation. */
defineProps<{ marks: ThirdPartyMark[]; note?: string | null }>()
</script>

<template>
  <v-alert type="warning" variant="tonal" density="comfortable" icon="mdi-shield-alert-outline" class="marks" data-testid="marks-banner">
    <strong>Este paquete usa marcas de terceros.</strong>
    Quinvite no ofrece plantillas con marcas ajenas: solo se acepta en un paquete privado y con permiso de uso por escrito archivado.
    <ul v-if="marks.length" class="marks-list" aria-label="Marcas de terceros declaradas">
      <li v-for="m in marks" :key="m.name">
        <strong>{{ m.name }}</strong>
        <span>Titular: {{ m.owner }}</span>
        <span>Uso: {{ m.usage }}</span>
      </li>
    </ul>
    <p v-else-if="note" class="mt-2 mb-0">{{ note }}</p>
  </v-alert>
</template>

<style scoped>
.marks-list { list-style: none; margin: 10px 0 0; padding: 0; display: grid; gap: 8px; }
.marks-list li { display: flex; flex-direction: column; gap: 2px; padding: 8px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.55); overflow-wrap: anywhere; font-size: 0.92rem; }
</style>
