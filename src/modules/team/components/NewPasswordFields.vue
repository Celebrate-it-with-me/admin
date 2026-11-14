<script setup lang="ts">
import { computed, ref } from 'vue'
import { SCORE_LABELS } from '@/modules/account/logic'
import { checkNewPassword, MIN_PASSWORD, passwordScore } from '../logic'

const props = defineProps<{ password: string; confirmation: string; passwordError?: string; confirmationError?: string }>()
const emit = defineEmits<{ 'update:password': [string]; 'update:confirmation': [string] }>()

const show = ref(false)
const check = computed(() => checkNewPassword(props.password, props.confirmation))
const score = computed(() => passwordScore(props.password))
const barColor = computed(() => ['grey-lighten-2', 'error', 'warning', 'info', 'success'][score.value])
</script>

<template>
  <div>
    <v-text-field
      :model-value="password" label="Contraseña nueva" :type="show ? 'text' : 'password'" autocomplete="new-password"
      :append-inner-icon="show ? 'mdi-eye-off-outline' : 'mdi-eye-outline'" :error-messages="passwordError"
      @click:append-inner="show = !show" @update:model-value="emit('update:password', $event)"
    />
    <div v-if="password" class="strength" aria-live="polite">
      <v-progress-linear :model-value="score * 25" :color="barColor" height="6" rounded aria-hidden="true" />
      <span class="text-caption">{{ SCORE_LABELS[score] }}</span>
    </div>
    <ul class="rules" aria-label="Requisitos de seguridad">
      <li :class="{ ok: check.longEnough }"><v-icon size="16" :icon="check.longEnough ? 'mdi-check-circle' : 'mdi-circle-outline'" /> Al menos {{ MIN_PASSWORD }} caracteres</li>
      <li :class="{ ok: check.matches }"><v-icon size="16" :icon="check.matches ? 'mdi-check-circle' : 'mdi-circle-outline'" /> Las dos contraseñas coinciden</li>
    </ul>
    <v-text-field
      :model-value="confirmation" label="Repite la contraseña" :type="show ? 'text' : 'password'" autocomplete="new-password"
      :error-messages="confirmationError" @update:model-value="emit('update:confirmation', $event)"
    />
  </div>
</template>

<style scoped>
.strength { display: flex; align-items: center; gap: 12px; margin: -8px 0 8px; }
.strength .v-progress-linear { flex: 1; }
.rules { list-style: none; padding: 0; margin: 0 0 16px; font-size: 0.8125rem; color: var(--ink-500); }
.rules li { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.rules li.ok { color: rgb(var(--v-theme-success)); }
</style>
