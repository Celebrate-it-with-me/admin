<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { renderSVG } from 'uqr'
import { confirmTwoFactor, startTwoFactor } from '../services/accountApi'
import { parseApiError } from '../logic'
import RecoveryCodesPanel from './RecoveryCodesPanel.vue'

/**
 * Turns on two-step verification in three steps: password, scan the QR and prove it with a code, save the recovery
 * codes (shown once). The QR is drawn here in the browser from the otpauth URI; the secret never goes to a third party.
 */
const props = defineProps<{ modelValue: boolean; email: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; done: [] }>()

type Step = 'password' | 'scan' | 'codes'
const step = ref<Step>('password')
const password = ref('')
const showPassword = ref(false)
const code = ref('')
const secret = ref('')
const otpauthUrl = ref('')
const codes = ref<string[]>([])
const saved = ref(false)
const loading = ref(false)
const error = ref('')
const secretCopied = ref(false)

watch(() => props.modelValue, open => {
  if (!open) return
  step.value = 'password'; password.value = ''; showPassword.value = false; code.value = ''; secret.value = ''; otpauthUrl.value = ''
  codes.value = []; saved.value = false; error.value = ''; secretCopied.value = false
})

const qr = computed(() => (otpauthUrl.value ? renderSVG(otpauthUrl.value, { ecc: 'M', border: 2 }) : ''))
const spacedSecret = computed(() => secret.value.replace(/(.{4})/g, '$1 ').trim())

const start = async () => {
  if (!password.value || loading.value) { error.value = password.value ? '' : 'Escribe tu contraseña.'; return }
  loading.value = true; error.value = ''
  try {
    const res = await startTwoFactor(password.value)
    secret.value = res.secret
    otpauthUrl.value = res.otpauthUrl
    password.value = ''
    step.value = 'scan'
  } catch (e) { error.value = parseApiError(e).message } finally { loading.value = false }
}

const confirm = async () => {
  const clean = code.value.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(clean)) { error.value = 'Escribe los 6 dígitos que muestra tu aplicación.'; return }
  if (loading.value) return
  loading.value = true; error.value = ''
  try {
    const res = await confirmTwoFactor(clean)
    codes.value = res.recoveryCodes
    secret.value = ''; otpauthUrl.value = ''
    step.value = 'codes'
  } catch (e) { error.value = parseApiError(e).message } finally { loading.value = false }
}

const copySecret = async () => {
  try {
    await navigator.clipboard.writeText(secret.value)
    secretCopied.value = true
    setTimeout(() => { secretCopied.value = false }, 2500)
  } catch { /* the secret is on screen to type by hand */ }
}

const cancel = () => { if (!loading.value && step.value !== 'codes') emit('update:modelValue', false) }
const finish = () => { emit('update:modelValue', false); emit('done') }
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="520" persistent scrollable @update:model-value="cancel" @keydown.esc="cancel">
    <v-card class="pa-2">
      <v-card-title class="dialog-title">
        <template v-if="step === 'password'">Activar verificación en dos pasos</template>
        <template v-else-if="step === 'scan'">Escanea el código QR</template>
        <template v-else>Guarda tus códigos de recuperación</template>
      </v-card-title>

      <v-card-text>
        <p class="steps text-caption text-medium-emphasis mb-3">Paso {{ step === 'password' ? 1 : step === 'scan' ? 2 : 3 }} de 3</p>

        <form v-if="step === 'password'" id="tf-start" novalidate @submit.prevent="start">
          <p class="mb-4 text-medium-emphasis">Necesitarás una aplicación de autenticación (Google Authenticator, Microsoft Authenticator, 1Password, Authy). Por seguridad, primero confirma tu contraseña.</p>
          <v-text-field
            v-model="password" label="Tu contraseña actual" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" autofocus
            :append-inner-icon="showPassword ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
            @click:append-inner="showPassword = !showPassword"
          />
        </form>

        <form v-else-if="step === 'scan'" id="tf-confirm" novalidate @submit.prevent="confirm">
          <ol class="how">
            <li>Abre tu aplicación de autenticación y elige «Añadir cuenta».</li>
            <li>Escanea este código QR.</li>
            <li>Escribe aquí el código de 6 dígitos que te muestra.</li>
          </ol>
          <div class="qr-wrap">
            <!-- Our own SVG, drawn from the otpauth URI in this browser. -->
            <div class="qr" role="img" :aria-label="`Código QR para añadir ${email} a tu aplicación de autenticación`" v-html="qr" />
          </div>
          <details class="manual mb-4">
            <summary>¿No puedes escanear? Escribe la clave a mano</summary>
            <div class="secret-row">
              <code class="secret">{{ spacedSecret }}</code>
              <v-btn size="small" variant="tonal" class="touch" :prepend-icon="secretCopied ? 'mdi-check' : 'mdi-content-copy'" @click="copySecret">{{ secretCopied ? 'Copiada' : 'Copiar' }}</v-btn>
            </div>
            <p class="text-caption text-medium-emphasis mt-2">Tipo de clave: basada en tiempo. Cuenta: {{ email }}.</p>
          </details>
          <v-text-field
            v-model="code" label="Código de 6 dígitos" inputmode="numeric" autocomplete="one-time-code" maxlength="7" autofocus
            @update:model-value="error = ''"
          />
        </form>

        <div v-else>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4"
            text="Si pierdes tu teléfono, estos códigos son la única forma de entrar. Cada uno sirve una vez y no volverás a verlos." />
          <recovery-codes-panel :codes="codes" :email="email" />
          <v-checkbox v-model="saved" color="primary" density="compact" hide-details class="mt-4" label="Ya guardé mis códigos en un lugar seguro" />
        </div>

        <div aria-live="polite">
          <v-alert v-if="error" type="error" variant="tonal" density="compact" class="mt-4" :text="error" />
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <template v-if="step === 'password'">
          <v-btn variant="text" class="touch" :disabled="loading" @click="cancel">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" class="touch" type="submit" form="tf-start" :loading="loading">Continuar</v-btn>
        </template>
        <template v-else-if="step === 'scan'">
          <v-btn variant="text" class="touch" :disabled="loading" @click="cancel">Cancelar</v-btn>
          <v-btn color="primary" variant="flat" class="touch" type="submit" form="tf-confirm" :loading="loading">Activar</v-btn>
        </template>
        <v-btn v-else color="primary" variant="flat" class="touch" :disabled="!saved" @click="finish">Listo</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.dialog-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.how { padding-left: 20px; margin-bottom: 16px; color: var(--ink-700); }
.how li { margin-bottom: 4px; }
.qr-wrap { display: flex; justify-content: center; margin-bottom: 16px; }
.qr { width: 208px; height: 208px; background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 8px; }
.qr :deep(svg) { width: 100%; height: 100%; display: block; }
.manual summary { cursor: pointer; font-weight: 600; min-height: 44px; display: flex; align-items: center; }
.secret-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.secret { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--cream-200); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; word-break: break-all; user-select: all; }
.touch { min-height: 44px; }
</style>
