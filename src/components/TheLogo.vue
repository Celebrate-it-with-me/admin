<script setup lang="ts">
import { useAppStore } from "@/store/app";
const store = useAppStore()
</script>

<template>
  <div class="logo">{{ store.developmentMode ? 'CWM Dev-mode' : 'CWM' }}</div>
</template>

<style scoped>
@font-face {
  font-family: 'Audiowide';
  src: url('@/assets/fonts/Audiowide-Regular.ttf') format('truetype');
}

.logo{
  font-family: 'Audiowide',serif;
}
</style>
