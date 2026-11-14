<script setup lang="ts">
import { ref } from 'vue'
import { disableTwoFactor, regenerateRecoveryCodes } from '../services/accountApi'
import { formatDateTime, parseApiError } from '../logic'
import type { TwoFactorStatus } from '../types'
import PasswordConfirmDialog from './PasswordConfirmDialog.vue'
import RecoveryCodesPanel from './RecoveryCodesPanel.vue'
import TwoFactorSetupDialog from './TwoFactorSetupDialog.vue'

const props = defineProps<{ status: TwoFactorStatus; email: string }>()
const emit = defineEmits<{ changed: [] }>()

const setupOpen = ref(false)
const regenOpen = ref(false)
const disableOpen = ref(false)
const codesOpen = ref(false)
const newCodes = ref<string[]>([])
const saved = ref(false)
const loading = ref(false)
const error = ref('')
const notice = ref('')

const openRegen = () => { error.value = ''; regenOpen.value = true }
const openDisable = () => { error.value = ''; disableOpen.value = true }

const regenerate = async (password: string) => {
  loading.value = true; error.value = ''
  try {
    const res = await regenerateRecoveryCodes(password)
    newCodes.value = res.recoveryCodes
    saved.value = false
    regenOpen.value = false
    codesOpen.value = true
    emit('changed')
  } catch (e) { error.value = parseApiError(e).message } finally { loading.value = false }
}

const disable = async (password: string) => {
  loading.value = true; error.value = ''
  try {
    await disableTwoFactor(password)
    disableOpen.value = false
    notice.value = 'Desactivaste la verificación en dos pasos. Cerramos tus otras sesiones y te avisamos por correo.'
    emit('changed')
  } catch (e) { error.value = parseApiError(e).message } finally { loading.value = false }
}

const onSetupDone = () => { notice.value = 'Verificación en dos pasos activada. Te avisamos por correo.'; emit('changed') }
const closeCodes = () => { codesOpen.value = false; newCodes.value = [] }
</script>

<template>
  <v-card class="pa-2">
    <v-card-title class="card-title d-flex align-center flex-wrap ga-2">
      Verificación en dos pasos
      <v-chip :color="props.status.enabled ? 'success' : 'default'" size="small" variant="tonal">{{ props.status.enabled ? 'Activa' : 'Desactivada' }}</v-chip>
    </v-card-title>
    <v-card-text>
      <v-alert v-if="props.status.required && !props.status.enabled" type="warning" variant="tonal" density="compact" class="mb-4"
        text="Tu rol exige verificación en dos pasos. Actívala para seguir usando el panel." />

      <template v-if="props.status.enabled">
        <p class="text-medium-emphasis mb-1">Al entrar te pedimos, además de la contraseña, un código de tu aplicación de autenticación. Activa desde {{ formatDateTime(props.status.confirmedAt) }}.</p>
        <p class="mb-4" :class="props.status.recoveryCodesRemaining <= 2 ? 'text-warning font-weight-medium' : 'text-medium-emphasis'">
          Códigos de recuperación disponibles: {{ props.status.recoveryCodesRemaining }} de 8.
          <template v-if="props.status.recoveryCodesRemaining <= 2">Genera códigos nuevos pronto.</template>
        </p>
        <div class="actions">
          <v-btn variant="tonal" class="touch" prepend-icon="mdi-key-chain-variant" @click="openRegen">Generar códigos nuevos</v-btn>
          <v-btn variant="tonal" color="error" class="touch" prepend-icon="mdi-shield-off-outline" @click="openDisable">Desactivar</v-btn>
        </div>
      </template>
      <template v-else>
        <p class="text-medium-emphasis mb-4">Protege tu cuenta con un segundo paso: un código que cambia cada 30 segundos en tu teléfono. Si alguien descubre tu contraseña, no podrá entrar sin él.</p>
        <v-btn color="primary" variant="flat" class="touch" prepend-icon="mdi-shield-key-outline" @click="setupOpen = true">Activar verificación en dos pasos</v-btn>
      </template>

      <div aria-live="polite">
        <v-alert v-if="notice" type="success" variant="tonal" density="compact" class="mt-4" closable :text="notice" @click:close="notice = ''" />
      </div>
    </v-card-text>

    <two-factor-setup-dialog v-model="setupOpen" :email="email" @done="onSetupDone" />

    <password-confirm-dialog
      v-model="regenOpen" title="Generar códigos nuevos" confirm-label="Generar"
      message="Los códigos que tienes ahora dejarán de funcionar. Los nuevos se muestran una sola vez."
      :loading="loading" :error="error" @confirm="regenerate"
    />
    <password-confirm-dialog
      v-model="disableOpen" title="Desactivar los dos pasos" confirm-label="Desactivar" danger
      message="Tu cuenta volverá a pedir solo la contraseña y cerraremos tus otras sesiones."
      :loading="loading" :error="error" @confirm="disable"
    />

    <v-dialog v-model="codesOpen" max-width="520" persistent scrollable @keydown.esc.prevent>
      <v-card class="pa-2">
        <v-card-title class="card-title">Tus códigos nuevos</v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4" text="Guárdalos ahora: no volverás a verlos. Cada uno sirve una sola vez." />
          <recovery-codes-panel :codes="newCodes" :email="email" />
          <v-checkbox v-model="saved" color="primary" density="compact" hide-details class="mt-4" label="Ya guardé mis códigos en un lugar seguro" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="flat" class="touch" :disabled="!saved" @click="closeCodes">Listo</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<style scoped>
.card-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; white-space: normal; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
.touch { min-height: 44px; }
</style>
