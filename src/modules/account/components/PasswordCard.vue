<script setup lang="ts">
import { computed, ref } from 'vue'
import { changePassword } from '../services/accountApi'
import { MIN_PASSWORD, SCORE_LABELS, checkPassword, parseApiError, passwordScore } from '../logic'

const emit = defineEmits<{ changed: [] }>()

const current = ref('')
const next = ref('')
const confirmation = ref('')
const show = ref(false)
const loading = ref(false)
const touched = ref(false)
const errors = ref<Record<string, string>>({})
const general = ref('')
const done = ref('')

const check = computed(() => checkPassword(current.value, next.value, confirmation.value))
const score = computed(() => passwordScore(next.value))
const barColor = computed(() => ['grey-lighten-2', 'error', 'warning', 'info', 'success'][score.value])

const submit = async () => {
  touched.value = true
  done.value = ''
  general.value = ''
  errors.value = {}
  if (!check.value.ok || loading.value) return
  loading.value = true
  try {
    const res = await changePassword({ currentPassword: current.value, newPassword: next.value, newPasswordConfirmation: confirmation.value })
    current.value = ''; next.value = ''; confirmation.value = ''; touched.value = false
    done.value = res.sessionsClosed > 0
      ? `Listo, cambiaste tu contraseña. Cerramos ${res.sessionsClosed} ${res.sessionsClosed === 1 ? 'sesión' : 'sesiones'} en otros dispositivos y te avisamos por correo.`
      : 'Listo, cambiaste tu contraseña. Te avisamos por correo.'
    emit('changed')
  } catch (e) {
    const err = parseApiError(e)
    errors.value = err.fields
    if (!Object.keys(err.fields).length) general.value = err.message
    if (err.status === 429) general.value = err.message
  } finally { loading.value = false }
}
</script>

<template>
  <v-card class="pa-2">
    <v-card-title class="card-title">Contraseña</v-card-title>
    <v-card-subtitle class="subtitle">Al cambiarla cerramos tus otras sesiones y te avisamos por correo.</v-card-subtitle>
    <v-card-text>
      <form novalidate class="form" @submit.prevent="submit">
        <v-text-field
          v-model="current" label="Contraseña actual" :type="show ? 'text' : 'password'" autocomplete="current-password"
          :error-messages="errors.currentPassword || (touched && !current ? 'Escribe tu contraseña actual.' : '')"
        />
        <v-text-field
          v-model="next" label="Contraseña nueva" :type="show ? 'text' : 'password'" autocomplete="new-password"
          :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
          :error-messages="errors.newPassword"
          @click:append-inner="show = !show"
        />
        <div v-if="next" class="strength" aria-live="polite">
          <v-progress-linear :model-value="score * 25" :color="barColor" height="6" rounded aria-hidden="true" />
          <span class="text-caption">{{ SCORE_LABELS[score] }}</span>
        </div>
        <ul class="rules" aria-label="Requisitos de seguridad">
          <li :class="{ ok: check.longEnough }"><v-icon size="16" :icon="check.longEnough ? 'mdi-check-circle' : 'mdi-circle-outline'" /> Al menos {{ MIN_PASSWORD }} caracteres</li>
          <li :class="{ ok: check.differentFromCurrent }"><v-icon size="16" :icon="check.differentFromCurrent ? 'mdi-check-circle' : 'mdi-circle-outline'" /> Distinta de la actual</li>
          <li :class="{ ok: check.matches }"><v-icon size="16" :icon="check.matches ? 'mdi-check-circle' : 'mdi-circle-outline'" /> Las dos contraseñas coinciden</li>
        </ul>
        <v-text-field
          v-model="confirmation" label="Repite la contraseña nueva" :type="show ? 'text' : 'password'" autocomplete="new-password"
          :error-messages="errors.newPasswordConfirmation || (touched && next && !check.matches ? 'Las contraseñas no coinciden.' : '')"
        />
        <div aria-live="polite">
          <v-alert v-if="general" type="error" variant="tonal" density="compact" class="mb-3" :text="general" />
          <v-alert v-if="done" type="success" variant="tonal" density="compact" class="mb-3" :text="done" />
        </div>
        <v-btn type="submit" color="primary" variant="flat" class="touch" :loading="loading">Cambiar contraseña</v-btn>
      </form>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.card-title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; }
.subtitle { white-space: normal; opacity: 0.8; }
.form { max-width: 440px; }
.strength { display: flex; align-items: center; gap: 12px; margin: -8px 0 8px; }
.strength .v-progress-linear { flex: 1; }
.rules { list-style: none; padding: 0; margin: 0 0 16px; font-size: 0.8125rem; color: var(--ink-500); }
.rules li { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.rules li.ok { color: rgb(var(--v-theme-success)); }
.touch { min-height: 44px; }
</style>
