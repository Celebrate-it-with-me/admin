<script setup lang="ts">
import StaffTwoFactorCard from '../components/StaffTwoFactorCard.vue'
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Seguridad</h2>
      <p class="text-medium-emphasis">Reglas de acceso para todo el personal del panel.</p>
    </header>
    <StaffTwoFactorCard />
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
@media (max-width: 960px) { .title { font-size: 1.625rem; } }
</style>
