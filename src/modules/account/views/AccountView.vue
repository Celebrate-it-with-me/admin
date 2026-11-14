<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCurrentUserStore } from '@/store/currentUser'
import { fetchProfile } from '../services/accountApi'
import { parseApiError } from '../logic'
import type { AccountProfile } from '../types'
import ProfileTab from '../components/ProfileTab.vue'
import SecurityTab from '../components/SecurityTab.vue'
import SessionsTab from '../components/SessionsTab.vue'

const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()

const TABS = ['profile', 'security', 'sessions'] as const
type Tab = typeof TABS[number]

const profile = ref<AccountProfile | null>(null)
const loading = ref(true)
const error = ref('')

const tab = computed<Tab>({
  get: () => (TABS.includes(route.query.tab as Tab) ? (route.query.tab as Tab) : 'profile'),
  set: value => { void router.replace({ query: { ...route.query, tab: value } }) },
})

const load = async () => {
  loading.value = true; error.value = ''
  try { profile.value = await fetchProfile() } catch (e) { error.value = parseApiError(e, 'No pudimos cargar tu cuenta.').message } finally { loading.value = false }
}

// After a change the header (name in the menu) and the security flags have to follow.
const onUpdated = (p: AccountProfile) => {
  profile.value = p
  currentUser.user = { ...currentUser.user, name: p.name, email: p.email }
}
const refresh = async () => {
  try { onUpdated(await fetchProfile()); await currentUser.getUser() } catch { /* the tab shows its own errors */ }
}

const onSignedOut = () => {
  currentUser.logout()
  void router.push({ name: 'Home' })
}

watch(() => currentUser.user.security?.twoFactorSetupRequired, required => { if (required) tab.value = 'security' })
onMounted(async () => {
  if (currentUser.user.security?.twoFactorSetupRequired) tab.value = 'security'
  await load()
})
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Mi cuenta</h2>
      <p class="text-medium-emphasis">Tus datos, tu contraseña, la verificación en dos pasos y las sesiones abiertas.</p>
    </header>

    <v-alert v-if="currentUser.user.security?.twoFactorSetupRequired" type="warning" variant="tonal" class="mb-4"
      title="Activa la verificación en dos pasos"
      text="Tu rol la exige. Hasta que la actives, el resto del panel estará bloqueado." />

    <v-tabs v-model="tab" color="primary" class="tabs" show-arrows>
      <v-tab value="profile" prepend-icon="mdi-account-outline">Perfil</v-tab>
      <v-tab value="security" prepend-icon="mdi-shield-lock-outline">Seguridad</v-tab>
      <v-tab value="sessions" prepend-icon="mdi-devices">Sesiones</v-tab>
    </v-tabs>

    <div class="pane">
      <v-skeleton-loader v-if="loading && !profile" type="card, card" />
      <v-alert v-else-if="error || !profile" type="error" variant="tonal">
        {{ error || 'No pudimos cargar tu cuenta.' }}
        <template #append><v-btn variant="text" class="touch" @click="load">Reintentar</v-btn></template>
      </v-alert>
      <template v-else>
        <profile-tab v-if="tab === 'profile'" :profile="profile" @updated="onUpdated" />
        <security-tab v-else-if="tab === 'security'" :profile="profile" @refresh="refresh" />
        <sessions-tab v-else @signed-out="onSignedOut" />
      </template>
    </div>
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.tabs { border-bottom: 1px solid var(--line); }
.pane { padding-top: 20px; }
.touch { min-height: 44px; }
@media (max-width: 960px) { .title { font-size: 1.625rem; } }
</style>
