<script setup lang="ts">
/** Plantillas | Paquetes: the two lists of the templates area. */
defineProps<{ current: 'templates' | 'packages' }>()
</script>

<template>
  <v-tabs :model-value="current" class="mb-4 tabs" aria-label="Plantillas y paquetes" color="primary">
    <v-tab value="templates" :to="{ name: 'Templates' }" prepend-icon="mdi-palette-outline">Plantillas</v-tab>
    <v-tab value="packages" :to="{ name: 'TemplatePackages' }" prepend-icon="mdi-package-variant-closed">Paquetes</v-tab>
  </v-tabs>
</template>

<style scoped>
.tabs { border-bottom: 1px solid var(--line); }
</style>
