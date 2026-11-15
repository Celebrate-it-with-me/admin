<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ConnectionCard from '../components/ConnectionCard.vue'
import MessagesTab from '../components/MessagesTab.vue'
import SummaryCards from '../components/SummaryCards.vue'
import TemplatesTab from '../components/TemplatesTab.vue'
import { emptyPeriod } from '../logic'

const me = useCurrentUserStore()
const canView = computed(() => me.can('admin.events.view'))
const canManage = computed(() => me.can('admin.whatsapp.manage'))

const tab = ref<'messages' | 'templates'>('messages')
const period = ref(emptyPeriod())
const summary = ref<InstanceType<typeof SummaryCards> | null>(null)
const messages = ref<InstanceType<typeof MessagesTab> | null>(null)

/** A test message was queued: refresh the list and the counters. */
const onSent = () => { void summary.value?.load(); void messages.value?.load() }
const clearPeriod = () => { period.value = emptyPeriod() }
const periodSet = computed(() => Boolean(period.value.from || period.value.to))
</script>

<template>
  <section>
    <header class="head">
      <h2 class="title">WhatsApp</h2>
      <p class="text-medium-emphasis">Cómo van los mensajes a invitados, el estado de la conexión con Meta y las plantillas.<template v-if="canView && !canManage"> Tienes acceso de lectura: los cambios los hace la persona superadmin.</template></p>
    </header>

    <v-card v-if="!canView" class="pa-8 empty" data-testid="forbidden">
      <v-icon size="40" icon="mdi-lock-outline" color="primary" class="mb-3" />
      <p class="empty__title">No tienes permiso para ver WhatsApp.</p>
      <p class="text-medium-emphasis">Pídele acceso a una persona superadmin.</p>
    </v-card>

    <template v-else>
      <ConnectionCard />

      <div class="period">
        <v-text-field v-model="period.from" label="Desde" type="date" hide-details density="comfortable" class="period__field" />
        <v-text-field v-model="period.to" label="Hasta" type="date" hide-details density="comfortable" class="period__field" />
        <v-btn v-if="periodSet" variant="text" prepend-icon="mdi-filter-off-outline" class="touch" @click="clearPeriod">Quitar fechas</v-btn>
        <span v-else class="text-body-2 text-medium-emphasis">Las fechas filtran el resumen y los mensajes.</span>
      </div>

      <SummaryCards ref="summary" :period="period" class="mb-6" />

      <v-tabs v-model="tab" color="primary" class="mb-4">
        <v-tab value="messages" prepend-icon="mdi-message-text-outline">Mensajes</v-tab>
        <v-tab value="templates" prepend-icon="mdi-file-document-outline">Plantillas</v-tab>
      </v-tabs>

      <MessagesTab v-show="tab === 'messages'" ref="messages" :period="period" @clear-period="clearPeriod" />
      <TemplatesTab v-show="tab === 'templates'" :can-manage="canManage" @sent="onSent" />
    </template>
  </section>
</template>

<style scoped>
.head { margin-bottom: 24px; }
.title { font-size: 2rem; margin-bottom: 4px; }
.period { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-bottom: 16px; }
.period__field { flex: 0 1 180px; min-width: 140px; }
.touch { min-height: 44px; }
.empty { text-align: center; }
.empty__title { font-family: var(--font-heading); font-size: 1.25rem; }
</style>
