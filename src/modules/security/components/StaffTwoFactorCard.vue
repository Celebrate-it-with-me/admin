<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useCurrentUserStore } from '@/store/currentUser'
import { fetchSecurity, setRequireTwoFactor } from '../services/securityApi'
import { activationWarning, coveragePercent, coverageText, hiddenCount, pendingCount, switchError } from '../logic'
import type { SecurityState } from '../types'

const me = useCurrentUserStore()
const canManage = computed(() => me.can('admin.security.manage'))
const ownTwoFactor = computed(() => !!me.user.security?.twoFactorEnabled)

const data = ref<SecurityState | null>(null)
const loading = ref(true)
const failed = ref(false)

// Keeps the previous data while it reloads (dimmed) and flags a failure without losing it.
const load = async () => {
  loading.value = true
  failed.value = false
  try { data.value = await fetchSecurity() } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const enabled = computed(() => data.value?.enabled ?? false)
const pending = computed(() => (data.value ? pendingCount(data.value) : 0))
const hidden = computed(() => (data.value ? hiddenCount(data.value) : 0))

const open = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const next = ref(false)

// The switch never changes by itself: it asks for a reason first, and the real state comes back from the server.
const onSwitch = (value: boolean | null) => {
  next.value = !!value
  error.value = ''
  open.value = true
}

const confirm = async (reason: string) => {
  busy.value = true
  error.value = ''
  try {
    data.value = await setRequireTwoFactor(next.value, reason)
    open.value = false
    notice.value = data.value.enabled
      ? 'Ahora se exige la verificación en dos pasos a todo el personal.'
      : 'Ya no se exige la verificación en dos pasos a todo el personal. Sigue siendo opcional.'
  } catch (e) {
    error.value = switchError(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <v-card class="scard pa-4 pa-sm-5" :aria-busy="loading" aria-labelledby="staff-2fa-title">
    <header class="scard__head">
      <v-icon icon="mdi-shield-lock-outline" size="22" class="scard__icon" aria-hidden="true" />
      <div class="scard__titles">
        <h3 id="staff-2fa-title" class="scard__title">Exigir 2FA a todo el personal</h3>
        <p class="scard__sub">La verificación en dos pasos pide un código de tu aplicación de autenticación al iniciar sesión. Aquí decides si es obligatoria para todo el equipo.</p>
      </div>
    </header>

    <v-alert v-if="failed" type="error" variant="tonal" density="comfortable" class="mb-3" text="No pudimos cargar el estado de seguridad.">
      <template #append><v-btn variant="text" class="touch" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <div v-if="!data && loading" aria-hidden="true">
      <v-skeleton-loader type="heading, text, text" class="scard__skeleton" />
    </div>

    <div v-else-if="data" :class="{ 'is-loading': loading }">
      <v-alert
        :type="enabled ? 'success' : 'info'" variant="tonal" density="comfortable" class="mb-4"
        :icon="enabled ? 'mdi-shield-check-outline' : 'mdi-shield-outline'"
      >
        <template v-if="enabled"><strong>Es obligatoria para todo el personal.</strong> Quien no la tenga solo puede entrar a Mi cuenta.</template>
        <template v-else><strong>Hoy es opcional.</strong> Cada persona decide si la activa en su cuenta.</template>
      </v-alert>

      <v-alert v-if="data.envForced" type="warning" variant="tonal" density="comfortable" class="mb-4" icon="mdi-server-security">
        Los superadmins ya la tienen exigida por la configuración del servidor (<code>ADMIN_REQUIRE_2FA_SUPERADMIN</code>). Esa regla se suma a este interruptor y no se puede apagar desde el panel.
      </v-alert>

      <v-alert v-if="notice" type="info" variant="tonal" density="comfortable" closable class="mb-4" :text="notice" @click:close="notice = ''" />

      <div class="coverage" role="group" aria-labelledby="coverage-text">
        <p id="coverage-text" class="coverage__text">{{ coverageText(data.enrolled, data.total) }}</p>
        <v-progress-linear
          :model-value="coveragePercent(data.enrolled, data.total)" :color="pending === 0 ? 'success' : 'primary'" height="8" rounded
          :aria-label="coverageText(data.enrolled, data.total)"
        />
      </div>

      <div class="switch-row">
        <v-switch
          :model-value="enabled" :disabled="!canManage || busy" color="primary" hide-details inset class="switch"
          :label="enabled ? 'Exigida a todo el personal' : 'Exigir a todo el personal'" @update:model-value="onSwitch"
        />
        <p v-if="!canManage" class="text-body-2 text-medium-emphasis">Solo un superadmin puede cambiar este ajuste.</p>
        <p v-else-if="!enabled && !ownTwoFactor" class="text-body-2 text-medium-emphasis">
          Para exigirla primero necesitas la tuya activa. <router-link :to="{ name: 'Account', query: { tab: 'security' } }">Actívala en Mi cuenta</router-link>.
        </p>
      </div>

      <section class="pending" aria-labelledby="pending-title">
        <h4 id="pending-title" class="pending__title">Sin verificación en dos pasos</h4>
        <p v-if="pending === 0" class="pending__empty">
          <v-icon icon="mdi-check-circle-outline" size="20" color="success" aria-hidden="true" />
          Todas las personas del equipo ya la tienen.
        </p>
        <template v-else>
          <ul class="people">
            <li v-for="person in data.notEnrolled" :key="person.id" class="person">
              <v-avatar color="rose-lighten-4" size="36" class="person__avatar" aria-hidden="true">
                <span class="text-caption font-weight-bold">{{ (person.name || person.email).slice(0, 1).toUpperCase() }}</span>
              </v-avatar>
              <div class="person__text">
                <span class="person__name">{{ person.name }}</span>
                <span class="person__email">{{ person.email }}</span>
              </div>
            </li>
          </ul>
          <p v-if="hidden > 0" class="text-body-2 text-medium-emphasis mt-2">y {{ hidden }} {{ hidden === 1 ? 'persona más' : 'personas más' }}.</p>
        </template>
      </section>
    </div>
  </v-card>

  <ReasonDialog
    v-model="open" :loading="busy" :error="error" :danger="false"
    :confirm-label="next ? 'Exigir a todo el personal' : 'Dejarla opcional'"
    :title="next ? 'Exigir la verificación en dos pasos' : 'Dejar la verificación en dos pasos como opcional'"
    :message="next ? 'Se aplica a todo el personal del panel, soporte y superadmins, desde el próximo clic de cada persona.' : 'Cada persona vuelve a decidir si usa la verificación en dos pasos. No se borra la de quien ya la activó.'"
    @confirm="confirm"
  >
    <v-alert v-if="next" type="warning" variant="tonal" density="comfortable" class="mb-4" icon="mdi-alert-outline" :text="activationWarning(pending)" />
  </ReasonDialog>
</template>

<style scoped>
.scard { max-width: 760px; }
.scard__head { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.scard__icon { color: var(--rose-600); margin-top: 4px; }
.scard__titles { flex: 1; min-width: 0; }
.scard__title { font-family: var(--font-heading); font-size: 1.25rem; line-height: 1.3; margin: 0; }
.scard__sub { font-size: 0.8125rem; color: var(--ink-500); margin: 2px 0 0; }
.scard__skeleton { background: transparent; margin: 0 -16px; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.coverage { margin-bottom: 8px; }
.coverage__text { font-weight: 600; margin: 0 0 8px; }
.switch-row { margin-bottom: 20px; }
.switch { min-height: 44px; }
.pending { border-top: 1px solid var(--line); padding-top: 16px; }
.pending__title { font-size: 0.9375rem; font-weight: 600; margin: 0 0 8px; }
.pending__empty { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--ink-500); }
.people { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.person { display: flex; align-items: center; gap: 12px; min-height: 48px; }
.person__text { display: flex; flex-direction: column; min-width: 0; }
.person__name { font-weight: 500; overflow-wrap: anywhere; }
.person__email { font-size: 0.8125rem; color: var(--ink-500); overflow-wrap: anywhere; }
.touch { min-height: 44px; }
code { font-size: 0.8125rem; overflow-wrap: anywhere; }
</style>
