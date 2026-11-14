<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getStatus } from '../services/whatsappApi'
import { agoLabel, maskedId } from '../logic'
import type { WaStatus } from '../types'

const status = ref<WaStatus | null>(null)
const loading = ref(true)
const failed = ref(false)
const copied = ref<'ok' | 'fail' | null>(null)

const load = async () => {
  loading.value = true
  failed.value = false
  try { status.value = await getStatus() } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)
defineExpose({ load })

/** fake: nothing leaves the server. meta without credentials: not connected yet. meta ready: connected. */
const state = computed<'fake' | 'pending' | 'live' | null>(() => {
  const s = status.value
  if (!s) return null
  if (s.driver === 'fake') return 'fake'
  return s.configured ? 'live' : 'pending'
})

const HEAD = {
  fake: { label: 'Modo de prueba', color: 'warning', icon: 'mdi-flask-outline' },
  pending: { label: 'Sin conectar', color: 'error', icon: 'mdi-link-off' },
  live: { label: 'Conectado a Meta', color: 'success', icon: 'mdi-check-circle-outline' },
} as const

const STEPS = [
  'En el servidor, define WHATSAPP_DRIVER=meta junto con WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET y WHATSAPP_VERIFY_TOKEN.',
  'En el panel de Meta, registra la URL del webhook de abajo con el mismo token de verificación y suscríbela al campo «messages».',
  'Aquí, en la pestaña Plantillas, pulsa «Enviar a aprobación» en cada una y espera el visto bueno de Meta.',
  'Envía una prueba a tu propio teléfono y activa el módulo WhatsApp en los planes de pago.',
]

const copy = async () => {
  const url = status.value?.webhookUrl
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    copied.value = 'ok'
  } catch {
    copied.value = 'fail'
  }
  setTimeout(() => { copied.value = null }, 2500)
}
</script>

<template>
  <v-card class="pa-4 pa-sm-5 mb-4" data-testid="connection" :aria-busy="loading">
    <v-skeleton-loader v-if="loading && !status" type="heading, text, text" />

    <v-alert v-else-if="failed" type="error" variant="tonal" text="No pudimos leer el estado de la conexión.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <template v-else-if="status && state">
      <div class="head">
        <h3 class="h">Conexión</h3>
        <v-chip :color="HEAD[state].color" variant="tonal" :prepend-icon="HEAD[state].icon" data-testid="connection-state">{{ HEAD[state].label }}</v-chip>
        <v-chip variant="outlined" size="small" data-testid="driver">Driver: {{ status.driver }}</v-chip>
      </div>

      <dl class="facts">
        <div><dt>Número de WhatsApp (ID)</dt><dd>{{ maskedId(status.phoneNumberId) }}</dd></div>
        <div><dt>Cuenta de empresa (ID)</dt><dd>{{ maskedId(status.businessAccountId) }}</dd></div>
        <div>
          <dt>Token de verificación</dt>
          <dd><v-icon size="16" :icon="status.verifyTokenSet ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'" :color="status.verifyTokenSet ? 'success' : 'error'" /> {{ status.verifyTokenSet ? 'Definido' : 'Falta' }}</dd>
        </div>
        <div>
          <dt>Secreto de la app</dt>
          <dd><v-icon size="16" :icon="status.appSecretSet ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'" :color="status.appSecretSet ? 'success' : 'error'" /> {{ status.appSecretSet ? 'Definido' : 'Falta' }}</dd>
        </div>
        <div><dt>Último aviso de Meta</dt><dd>{{ agoLabel(status.lastWebhookAt) }}</dd></div>
      </dl>

      <div class="webhook">
        <v-text-field :model-value="status.webhookUrl" label="URL del webhook" readonly hide-details density="comfortable" class="webhook__field" />
        <v-btn variant="tonal" prepend-icon="mdi-content-copy" class="touch" @click="copy">Copiar</v-btn>
      </div>
      <p class="sr-only" role="status" aria-live="polite">{{ copied === 'ok' ? 'URL copiada' : copied === 'fail' ? 'No se pudo copiar' : '' }}</p>
      <p v-if="copied" class="copied" :class="{ 'copied--fail': copied === 'fail' }">{{ copied === 'ok' ? 'Copiada.' : 'No pudimos copiarla: selecciónala y cópiala a mano.' }}</p>

      <v-alert v-if="state !== 'live'" :type="state === 'fake' ? 'info' : 'warning'" variant="tonal" class="mt-4" data-testid="how-to-connect">
        <template #title>{{ state === 'fake' ? 'Estás en modo de prueba' : 'WhatsApp todavía no está conectado' }}</template>
        <p class="mb-2">
          <template v-if="state === 'fake'">Los mensajes no salen a ningún teléfono: se simulan y las plantillas se aprueban al instante. Sirve para probar todo el flujo sin una cuenta de Meta.</template>
          <template v-else>Falta configurar las credenciales de Meta, así que no se puede enviar a aprobación ni sincronizar plantillas.</template>
          Para conectar WhatsApp de verdad:
        </p>
        <ol class="steps">
          <li v-for="s in STEPS" :key="s">{{ s }}</li>
        </ol>
      </v-alert>
    </template>
  </v-card>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 16px; }
.h { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; margin-right: 4px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px 24px; margin: 0 0 16px; }
.facts dt { font-size: 0.75rem; color: var(--ink-500); }
.facts dd { margin: 2px 0 0; font-weight: 600; overflow-wrap: anywhere; }
.webhook { display: flex; flex-wrap: wrap; gap: 8px; align-items: flex-start; }
.webhook__field { flex: 1 1 260px; min-width: 0; }
.touch { min-height: 44px; }
.copied { margin: 6px 0 0; font-size: 0.8125rem; color: rgb(var(--v-theme-success)); }
.copied--fail { color: rgb(var(--v-theme-error)); }
:deep(.v-alert__content) { min-width: 0; overflow-wrap: anywhere; }
.steps { margin: 0; padding-left: 1.25rem; display: grid; gap: 4px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
