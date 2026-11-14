<template>
  <v-app>
    <router-view />
    <ReauthDialog />
  </v-app>
</template>
<script setup lang="ts">
import ReauthDialog from '@/components/ReauthDialog.vue'
</script>
