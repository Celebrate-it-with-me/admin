<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import MessageStatusChip from './MessageStatusChip.vue'
import type { WaMessage } from '../types'
import { dateTimeLabel, failureText, LOCALE_NAMES, messageTimeline, TEMPLATE_NAMES } from '../logic'

const props = defineProps<{ message: WaMessage | null }>()
const emit = defineEmits<{ close: [] }>()
const { smAndDown } = useDisplay()
const open = computed(() => props.message !== null)
const steps = computed(() => (props.message ? messageTimeline(props.message) : []))
</script>

<template>
  <v-dialog :model-value="open" :fullscreen="smAndDown" max-width="560" scrollable @update:model-value="emit('close')">
    <v-card v-if="message" data-testid="message-detail">
      <v-card-title class="d-flex align-center justify-space-between ga-3">
        <span class="title">Mensaje #{{ message.id }}</span>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar" class="touch" @click="emit('close')" />
      </v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap align-center ga-2 mb-4">
          <MessageStatusChip kind="message" :status="message.status" />
          <span class="text-body-2 text-medium-emphasis">{{ TEMPLATE_NAMES[message.templateKey] }} · {{ LOCALE_NAMES[message.locale] }}</span>
        </div>

        <v-alert v-if="message.status === 'failed'" type="error" variant="tonal" class="mb-4" data-testid="failure">
          <template #title>No se pudo entregar</template>
          {{ failureText(message) }}
          <p v-if="message.errorCode" class="code">Código: {{ message.errorCode }}<template v-if="message.errorMessage"> · {{ message.errorMessage }}</template></p>
        </v-alert>

        <dl class="facts">
          <div><dt>Teléfono</dt><dd>{{ message.to }}</dd></div>
          <div>
            <dt>Invitado</dt>
            <dd>{{ message.guestName ?? 'Sin invitado (envío de prueba)' }}</dd>
          </div>
          <div>
            <dt>Evento</dt>
            <dd>
              <router-link v-if="message.eventId" :to="{ name: 'EventDetail', params: { id: message.eventId } }" data-testid="event-link">{{ message.eventName ?? `Evento ${message.eventId}` }}</router-link>
              <template v-else>—</template>
            </dd>
          </div>
          <div><dt>ID en WhatsApp</dt><dd class="mono">{{ message.waMessageId ?? '—' }}</dd></div>
        </dl>

        <h4 class="sub">Recorrido</h4>
        <ol class="timeline">
          <li v-for="s in steps" :key="s.key"><strong>{{ s.label }}</strong><span>{{ dateTimeLabel(s.at) }}</span></li>
        </ol>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.title { font-family: var(--font-heading); font-size: 1.375rem; font-weight: 500; }
.touch { min-width: 44px; min-height: 44px; }
.facts { display: grid; gap: 12px; margin: 0 0 20px; }
.facts dt { font-size: 0.75rem; color: var(--ink-500); }
.facts dd { margin: 2px 0 0; overflow-wrap: anywhere; }
.facts a { color: rgb(var(--v-theme-primary)); font-weight: 600; }
.mono { font-family: ui-monospace, monospace; font-size: 0.8125rem; }
.code { margin: 6px 0 0; font-size: 0.8125rem; overflow-wrap: anywhere; }
.sub { font-size: 0.875rem; margin-bottom: 8px; }
.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.timeline li { display: flex; justify-content: space-between; gap: 12px; font-size: 0.875rem; border-bottom: 1px solid var(--ink-100, rgba(0,0,0,.08)); padding-bottom: 6px; }
.timeline span { color: var(--ink-500); text-align: right; }
</style>
