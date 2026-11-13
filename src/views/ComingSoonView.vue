<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { PLACEHOLDERS } from '@/config/navigation'

const route = useRoute()
const item = computed(() => PLACEHOLDERS.find(i => i.key === route.name))
</script>

<template>
  <section v-if="item" class="soon">
    <v-avatar color="rose-lighten-5" size="64" class="mb-5">
      <v-icon :icon="item.icon" color="primary" size="30" aria-hidden="true" />
    </v-avatar>
    <v-chip color="warning" variant="tonal" size="small" prepend-icon="mdi-hammer-wrench" class="mb-4">En construcción</v-chip>
    <h2 class="soon__title">{{ item.title }}</h2>
    <p class="soon__text">{{ item.about }}</p>
    <p v-if="item.brief" class="soon__brief">Módulo {{ item.brief }} del brief de administración</p>
    <v-btn :to="{ name: 'MainDashboard' }" variant="outlined" color="primary" prepend-icon="mdi-arrow-left" class="mt-6">Volver al inicio</v-btn>
  </section>
</template>

<style scoped>
.soon { display: flex; flex-direction: column; align-items: center; text-align: center; max-width: 520px; margin: 48px auto 0; }
.soon__title { font-size: 2rem; margin-bottom: 8px; }
.soon__text { color: var(--ink-700); line-height: 1.6; text-wrap: pretty; }
.soon__brief { margin-top: 16px; font-size: 0.8125rem; color: var(--ink-500); }
</style>
