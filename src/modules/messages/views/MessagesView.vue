<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { useRouter } from 'vue-router'
import { useCurrentUserStore } from '@/store/currentUser'
import { LOCALES, formatDateTime, isEdited, matchesSearch, parseError } from '../logic'
import { listMessages } from '../services/messagesApi'
import type { Message } from '../types'

const { smAndDown } = useDisplay()
const router = useRouter()
const me = useCurrentUserStore()
const canView = computed(() => me.can('admin.events.view'))

const items = ref<Message[]>([])
const search = ref('')
const loading = ref(true)
const error = ref('')

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  error.value = ''
  try {
    const result = await listMessages()
    if (request === latest) items.value = result
  } catch (e) {
    if (request === latest) error.value = parseError(e, 'No pudimos cargar los mensajes.').message
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(() => { if (canView.value) void load(); else loading.value = false })

const shown = computed(() => items.value.filter(m => matchesSearch(m, search.value)))
const open = (m: Message) => router.push({ name: 'MessageEditor', params: { key: m.key } })
</script>

<template>
  <section>
    <header class="head">
      <h2 class="title">Textos de mensajes</h2>
      <p class="text-medium-emphasis">Lo que dicen los correos que envía Quinvite, en español y en inglés. Los mensajes de WhatsApp se editan en la consola de WhatsApp.</p>
    </header>

    <v-alert v-if="!canView" type="warning" variant="tonal" class="mb-4" text="No tienes permiso para ver los textos de los mensajes." />

    <template v-else>
      <v-alert v-if="error" type="error" variant="tonal" class="mb-4" :text="error">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <v-card v-if="items.length || search" class="pa-3 mb-4">
        <v-text-field v-model="search" label="Buscar un mensaje" prepend-inner-icon="mdi-magnify" clearable hide-details density="comfortable" autocomplete="off" />
      </v-card>

      <p class="sr-only" role="status" aria-live="polite">{{ loading ? 'Cargando…' : `${shown.length} mensajes` }}</p>

      <v-card v-if="loading && !items.length" class="pa-2" aria-busy="true"><v-skeleton-loader type="list-item-three-line@4" /></v-card>

      <v-card v-else-if="!shown.length && !error" class="pa-8 empty">
        <v-icon size="40" icon="mdi-email-edit-outline" color="primary" class="mb-3" />
        <template v-if="search">
          <p class="empty__title">Ningún mensaje coincide con «{{ search }}».</p>
          <v-btn variant="tonal" class="touch mt-3" @click="search = ''">Quitar la búsqueda</v-btn>
        </template>
        <template v-else><p class="empty__title">Todavía no hay mensajes editables.</p></template>
      </v-card>

      <div v-else-if="smAndDown" class="cards">
        <v-card v-for="m in shown" :key="m.key" class="mcard" :data-message="m.key">
          <strong class="mcard__name">{{ m.name }}</strong>
          <p class="mcard__desc">{{ m.description }}</p>
          <div class="chips">
            <v-chip v-for="l in LOCALES" :key="l.value" size="small" :color="isEdited(m, l.value) ? 'primary' : undefined" :variant="isEdited(m, l.value) ? 'tonal' : 'outlined'" :prepend-icon="isEdited(m, l.value) ? 'mdi-pencil-outline' : 'mdi-file-document-outline'" :data-locale="l.value" :data-edited="isEdited(m, l.value)">{{ l.value.toUpperCase() }} · {{ isEdited(m, l.value) ? 'Editado' : 'Original' }}</v-chip>
          </div>
          <v-btn variant="tonal" prepend-icon="mdi-pencil-outline" class="touch mt-3" block @click="open(m)">Editar textos</v-btn>
        </v-card>
      </div>

      <v-card v-else class="table-card">
        <v-table>
          <thead>
            <tr><th scope="col">Mensaje</th><th scope="col">Español</th><th scope="col">English</th><th scope="col">Último cambio</th><th scope="col" class="text-right"><span class="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="m in shown" :key="m.key" :data-message="m.key">
              <td class="wide"><strong>{{ m.name }}</strong><div class="sub">{{ m.description }}</div></td>
              <td v-for="l in LOCALES" :key="l.value">
                <v-chip size="small" :color="isEdited(m, l.value) ? 'primary' : undefined" :variant="isEdited(m, l.value) ? 'tonal' : 'outlined'" :prepend-icon="isEdited(m, l.value) ? 'mdi-pencil-outline' : 'mdi-file-document-outline'" :data-locale="l.value" :data-edited="isEdited(m, l.value)">{{ isEdited(m, l.value) ? 'Editado' : 'Original' }}</v-chip>
              </td>
              <td class="when">{{ m.updatedAt ? formatDateTime(m.updatedAt) : '—' }}</td>
              <td class="text-right nowrap"><v-btn icon="mdi-pencil-outline" variant="text" :aria-label="`Editar «${m.name}»`" @click="open(m)" /></td>
            </tr>
          </tbody>
        </v-table>
      </v-card>
    </template>
  </section>
</template>

<style scoped>
.head { margin-bottom: 24px; }
.title { font-size: 2rem; margin-bottom: 4px; }
.touch { min-height: 44px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.nowrap { white-space: nowrap; }
.wide { min-width: 280px; max-width: 460px; }
.when { font-size: 0.875rem; white-space: nowrap; }
.sub { font-size: 0.8125rem; color: var(--ink-500); }
.empty { text-align: center; }
.empty__title { font-family: var(--font-heading); font-size: 1.25rem; overflow-wrap: anywhere; }
.cards { display: grid; gap: 12px; }
.mcard { padding: 14px 16px; }
.mcard__name { overflow-wrap: anywhere; }
.mcard__desc { margin: 4px 0 10px; font-size: 0.8125rem; color: var(--ink-500); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
</style>
