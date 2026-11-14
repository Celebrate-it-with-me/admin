<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { detect } from 'detect-browser'
import { useCurrentUserStore } from '@/store/currentUser'
import { ROLE_LABELS } from '@/composables/useAuditLabels'
import InviteShell from '../components/InviteShell.vue'
import NewPasswordFields from '../components/NewPasswordFields.vue'
import { acceptInvitation, getInvitation } from '../services/teamApi'
import { checkNewPassword, expiryLabel, fieldErrors, inviteLoadFailure, parseTeamError } from '../logic'
import type { InvitationPreview, InviteLoadState } from '../types'

/**
 * Public page of the invitation mail (/accept-invite?token=): shows who was invited and with which role, asks for the
 * password (and the name, or the current password of an account that already exists), and signs her in.
 */
const route = useRoute()
const router = useRouter()
const currentUser = useCurrentUserStore()

const token = typeof route.query.token === 'string' ? route.query.token : ''
const state = ref<InviteLoadState>('loading')
const invite = ref<InvitationPreview | null>(null)

const load = async () => {
  if (!token) { state.value = 'invalid'; return }
  state.value = 'loading'
  try {
    invite.value = await getInvitation(token)
    state.value = 'ready'
  } catch (e) { state.value = inviteLoadFailure(e) }
}
onMounted(load)

// ── form ──
const name = ref('')
const current = ref('')
const password = ref('')
const confirmation = ref('')
const touched = ref(false)
const loading = ref(false)
const errors = ref<Record<string, string>>({})
const general = ref('')
const showCurrent = ref(false)

const existing = computed(() => !!invite.value?.accountExists)
// An account that already exists only confirms with its current password; a new one sets a name (if missing) and a password.
const needsName = computed(() => !!invite.value && !invite.value.name && !existing.value)
const check = computed(() => checkNewPassword(password.value, confirmation.value))
const missing = computed(() => ({
  name: needsName.value && !name.value.trim() ? 'Escribe tu nombre.' : '',
  current: existing.value && !current.value ? 'Escribe tu contraseña actual de Quinvite.' : '',
}))

// ── after accepting ──
const done = ref(false)
const setupTwoFactor = ref(false)
const challenge = ref('')
const code = ref('')
const useRecovery = ref(false)

const device = () => {
  const browser = detect()
  return browser ? `${browser.name} ${browser.version}` : 'unknown'
}

const finish = async (setupRequired: boolean) => {
  setupTwoFactor.value = setupRequired || !!currentUser.user.security?.twoFactorSetupRequired
  done.value = true
  challenge.value = ''
  await nextTick()
  document.querySelector<HTMLElement>('h1')?.focus()
}

const submit = async () => {
  touched.value = true
  general.value = ''
  errors.value = {}
  if (loading.value || missing.value.name || missing.value.current || (!existing.value && !check.value.ok)) return
  loading.value = true
  try {
    // `device` is sent as the login sends it.
    const result = await acceptInvitation(token, existing.value
      ? { current_password: current.value, device: device() }
      : { ...(needsName.value ? { name: name.value.trim() } : {}), password: password.value, password_confirmation: confirmation.value, device: device() })
    password.value = ''; confirmation.value = ''; current.value = ''
    if (result.kind === 'challenge') {
      // She already had admin two-factor: the login's second step finishes the sign-in.
      challenge.value = result.challenge
      return
    }
    await currentUser.startSession(result.token)
    await finish(result.twoFactorSetupRequired)
  } catch (e) {
    const err = parseTeamError(e)
    if (err.code === 'invitation_expired') { state.value = 'expired'; return }
    if (err.code === 'invitation_invalid') { state.value = 'invalid'; return }
    const fields = fieldErrors(e)
    errors.value = fields
    if (!Object.keys(fields).length) general.value = err.message
  } finally { loading.value = false }
}

const verify = async () => {
  const value = code.value.trim()
  if (loading.value) return
  if (!value) { general.value = useRecovery.value ? 'Escribe uno de tus códigos de recuperación.' : 'Escribe el código de 6 dígitos.'; return }
  loading.value = true
  general.value = ''
  try {
    const secret = useRecovery.value ? { recoveryCode: value } : { code: value.replace(/\s+/g, '') }
    const res = (await currentUser.completeTwoFactor(challenge.value, secret, device())) as { status?: number; response?: { status?: number; data?: { errors?: Record<string, string[]> } } }
    if (res.status === 200) { await finish(false); return }
    const status = res.response?.status
    if (status === 422 && res.response?.data?.errors?.challenge) {
      challenge.value = ''
      general.value = 'El intento venció. Entra con tu correo y tu contraseña nueva desde la pantalla de acceso.'
    } else if (status === 422) general.value = useRecovery.value ? 'Ese código de recuperación no es válido o ya se usó.' : 'El código no es correcto. Revisa que la hora de tu teléfono esté en automático.'
    else if (status === 429) general.value = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
    else general.value = 'No pudimos verificar el código. Inténtalo de nuevo.'
  } finally { loading.value = false }
}

const toLogin = () => router.push({ name: 'Login' })
const goNext = () => router.push(setupTwoFactor.value ? { name: 'Account', query: { tab: 'security' } } : { name: 'MainDashboard' })

const title = computed(() => {
  if (done.value) return 'Tu cuenta está lista'
  if (challenge.value) return 'Un último paso'
  return ({ loading: 'Tu invitación', ready: 'Únete al equipo', invalid: 'Esta invitación no sirve', expired: 'Esta invitación venció', network: 'No pudimos cargarla', error: 'Algo salió mal' } as const)[state.value]
})
const lead = computed(() => {
  if (done.value || state.value !== 'ready') return ''
  if (challenge.value) return 'Tu cuenta ya tiene la verificación en dos pasos. Escribe el código para entrar.'
  return existing.value ? 'Confirma tu cuenta para entrar al panel de Quinvite.' : 'Crea tu contraseña para entrar al panel de Quinvite.'
})
</script>

<template>
  <InviteShell :title="title" :lead="lead">
    <div aria-live="polite">
      <!-- Loading -->
      <v-skeleton-loader v-if="state === 'loading'" type="article, actions" aria-busy="true" />

      <!-- Invalid / expired / network -->
      <template v-else-if="state === 'invalid'">
        <v-alert type="error" variant="tonal" class="mb-4" text="Este enlace no existe, ya se usó o alguien lo revocó. Si te invitaron hace poco, revisa que sea el correo más reciente." />
        <p class="text-medium-emphasis mb-4">Si crees que es un error, pide a quien te invitó que te envíe una invitación nueva.</p>
        <v-btn variant="tonal" class="touch" @click="toLogin">Ir a la pantalla de acceso</v-btn>
      </template>
      <template v-else-if="state === 'expired'">
        <v-alert type="warning" variant="tonal" class="mb-4" text="El enlace de tu invitación ya caducó, por seguridad." />
        <p class="text-medium-emphasis mb-4">Pide a quien te invitó que te la reenvíe: recibirás un correo nuevo con un enlace que sí funciona.</p>
        <v-btn variant="tonal" class="touch" @click="toLogin">Ir a la pantalla de acceso</v-btn>
      </template>
      <template v-else-if="state === 'network' || state === 'error'">
        <v-alert type="error" variant="tonal" class="mb-4" :text="state === 'network' ? 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.' : 'No pudimos cargar tu invitación. Inténtalo de nuevo en un momento.'" />
        <v-btn color="primary" variant="flat" class="touch" @click="load">Reintentar</v-btn>
      </template>

      <!-- Success -->
      <template v-else-if="done">
        <v-alert type="success" variant="tonal" class="mb-4" text="Creaste tu contraseña y ya estás dentro." />
        <p v-if="setupTwoFactor" class="mb-4">Antes de empezar, activa la verificación en dos pasos: el panel la exige y solo toma un minuto.</p>
        <v-btn color="primary" variant="flat" size="large" block class="touch" @click="goNext">{{ setupTwoFactor ? 'Activar los dos pasos' : 'Entrar al panel' }}</v-btn>
      </template>

      <!-- Two-factor challenge (account that already had it) -->
      <form v-else-if="challenge" novalidate @submit.prevent="verify">
        <v-text-field
          v-model="code" :label="useRecovery ? 'Código de recuperación' : 'Código de verificación'" :inputmode="useRecovery ? 'text' : 'numeric'"
          autocomplete="one-time-code" :maxlength="useRecovery ? 14 : 7" prepend-inner-icon="mdi-shield-key-outline" autofocus @update:model-value="general = ''"
        />
        <v-alert v-if="general" type="error" variant="tonal" density="compact" class="mb-4" :text="general" />
        <v-btn type="submit" color="primary" size="large" block class="touch" :loading="loading">Verificar</v-btn>
        <v-btn variant="text" class="touch mt-2" @click="useRecovery = !useRecovery; code = ''; general = ''">{{ useRecovery ? 'Usar el código de mi aplicación' : 'Usar un código de recuperación' }}</v-btn>
      </form>

      <!-- Ready -->
      <form v-else-if="state === 'ready' && invite" novalidate @submit.prevent="submit">
        <v-card variant="tonal" color="primary" class="who pa-4 mb-6">
          <p class="who__label">Te invitaron a Quinvite como</p>
          <v-chip color="primary" variant="flat" size="small" class="mb-2">{{ ROLE_LABELS[invite.role] ?? invite.role }}</v-chip>
          <p v-if="invite.name" class="who__name">{{ invite.name }}</p>
          <p class="who__email"><v-icon size="16" icon="mdi-email-outline" /> {{ invite.email }}</p>
          <p class="who__expiry">{{ expiryLabel(invite.expiresAt).replace(/^vence/, 'La invitación vence') }}</p>
        </v-card>

        <v-text-field
          v-if="needsName" v-model="name" label="Tu nombre" autocomplete="name" prepend-inner-icon="mdi-account-outline"
          :error-messages="errors.name || (touched ? missing.name : '')"
        />
        <template v-if="existing">
          <v-alert type="info" variant="tonal" density="compact" class="mb-4" text="Ya tienes una cuenta en Quinvite con este correo. Usarás la contraseña de tu cuenta de Quinvite; no la cambiaremos." />
          <v-text-field
            v-model="current" label="Tu contraseña actual de Quinvite" :type="showCurrent ? 'text' : 'password'" autocomplete="current-password"
            :append-inner-icon="showCurrent ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            :error-messages="errors.current_password || (touched ? missing.current : '')" @click:append-inner="showCurrent = !showCurrent"
          />
        </template>
        <NewPasswordFields
          v-else
          v-model:password="password" v-model:confirmation="confirmation"
          :password-error="errors.password" :confirmation-error="touched && password && !check.matches ? 'Las contraseñas no coinciden.' : ''"
        />

        <p v-if="invite.requiresTwoFactor" class="hint"><v-icon size="16" icon="mdi-shield-lock-outline" /> Después te pediremos activar la verificación en dos pasos.</p>
        <v-alert v-if="general" type="error" variant="tonal" density="compact" class="mb-4" :text="general" />
        <v-btn type="submit" color="primary" size="large" block class="touch" :loading="loading">{{ existing ? 'Unirme al equipo' : 'Crear mi contraseña y entrar' }}</v-btn>
      </form>
    </div>
  </InviteShell>
</template>

<style scoped>
.touch { min-height: 44px; }
.who__label { font-size: 0.8125rem; margin-bottom: 6px; color: var(--ink-700); }
.who__name { margin: 0; font-family: var(--font-heading); font-size: 1.25rem; color: var(--ink-900); }
.who__email { margin: 0; font-weight: 600; overflow-wrap: anywhere; color: var(--ink-900); }
.who__expiry { margin: 6px 0 0; font-size: 0.8125rem; color: var(--ink-700); }
.hint { font-size: 0.875rem; color: var(--ink-500); margin-bottom: 16px; display: flex; gap: 6px; align-items: flex-start; }
</style>
