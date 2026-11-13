<script setup lang="ts">
import { ref } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ImpersonateDialog from './ImpersonateDialog.vue'

defineProps<{
  user: { id: number; name: string }
  supportRequestId?: number | null
  /** `block` for the actions column, `compact` for a small button next to a name. */
  size?: 'block' | 'compact'
}>()

const me = useCurrentUserStore()
const open = ref(false)
</script>

<template>
  <div v-if="me.can('admin.impersonate')">
    <v-btn
      :class="size === 'compact' ? 'enter enter--compact' : 'enter'"
      variant="outlined" color="primary" prepend-icon="mdi-account-switch-outline"
      @click="open = true"
    >Entrar como esta usuaria</v-btn>
    <ImpersonateDialog v-model="open" :user="user" :support-request-id="supportRequestId" />
  </div>
</template>

<style scoped>
.enter { min-height: 44px; justify-content: flex-start; }
.enter--compact { justify-content: center; }
</style>
