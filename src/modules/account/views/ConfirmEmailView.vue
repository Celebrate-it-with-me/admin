<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUserStore } from '@/store/currentUser'
import { confirmEmailChange } from '../services/accountApi'
import { parseApiError } from '../logic'

/** Where the link in the mail lands: confirms the new sign-in email for the person who is logged in. */
const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()

const state = ref<'working' | 'done' | 'error'>('working')
const message = ref('')
const email = ref('')

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) { state.value = 'error'; message.value = 'El enlace está incompleto. Pide el cambio de correo de nuevo desde Mi cuenta.'; return }
  try {
    const profile = await confirmEmailChange(token)
    email.value = profile.email
    currentUser.user = { ...currentUser.user, email: profile.email }
    state.value = 'done'
  } catch (e) {
    state.value = 'error'
    const err = parseApiError(e, 'No pudimos confirmar el cambio.')
    message.value = err.fields.token || err.message
  }
})
</script>

<template>
  <section class="confirm">
    <v-card class="pa-4">
      <div aria-live="polite">
        <div v-if="state === 'working'" class="text-center py-6">
          <v-progress-circular indeterminate color="primary" />
          <p class="mt-4 text-medium-emphasis">Confirmando tu correo nuevo…</p>
        </div>
        <template v-else-if="state === 'done'">
          <h2 class="title">Correo actualizado</h2>
          <p class="mb-6">Desde ahora entras al panel con <strong>{{ email }}</strong>. Avisamos a tu correo anterior.</p>
          <v-btn color="primary" variant="flat" class="touch" @click="router.push({ name: 'Account' })">Ir a Mi cuenta</v-btn>
        </template>
        <template v-else>
          <h2 class="title">No pudimos confirmarlo</h2>
          <v-alert type="error" variant="tonal" density="compact" class="mb-6" :text="message" />
          <v-btn color="primary" variant="flat" class="touch" @click="router.push({ name: 'Account' })">Ir a Mi cuenta</v-btn>
        </template>
      </div>
    </v-card>
  </section>
</template>

<style scoped>
.confirm { max-width: 520px; }
.title { font-size: 1.75rem; margin-bottom: 12px; }
.touch { min-height: 44px; }
</style>
