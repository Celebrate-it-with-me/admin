<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { listTemplates } from '../services/templatesApi'
import { eventTypeLabel, eventsLabel, formatDate } from '../logic'
import type { TemplateSummary } from '../types'

const templates = ref<TemplateSummary[] | null>(null)
const loading = ref(true)
const failed = ref(false)

const load = async () => {
  loading.value = true
  failed.value = false
  try { templates.value = await listTemplates() } catch { failed.value = true } finally { loading.value = false }
}
onMounted(load)

const empty = computed(() => !loading.value && !failed.value && templates.value?.length === 0)
const published = (t: TemplateSummary) => (t.currentVersion ? `Versión ${t.currentVersion.version}` : 'Sin publicar')
</script>

<template>
  <div>
    <p class="text-medium-emphasis mb-4 intro">
      Las plantillas de invitación tienen versiones. Una versión publicada no se edita: se crea un borrador, se prueba con la vista previa y se publica.
      Las invitaciones que ya salieron no cambian de aspecto.
    </p>

    <div v-if="loading && !templates" aria-busy="true" role="status" aria-label="Cargando las plantillas">
      <v-skeleton-loader v-for="n in 3" :key="n" type="list-item-two-line" class="mb-3" />
    </div>

    <v-card v-else-if="failed && !templates" class="pa-6 text-center">
      <p class="mb-3">No pudimos cargar las plantillas.</p>
      <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="load">Reintentar</v-btn>
    </v-card>

    <v-card v-else-if="empty" class="pa-6 text-center">
      <p class="text-medium-emphasis">Todavía no hay plantillas.</p>
    </v-card>

    <div v-else-if="templates" :class="{ dim: loading }" :aria-busy="loading">
      <v-alert v-if="failed" type="error" variant="tonal" density="compact" class="mb-3">
        No pudimos actualizar.
        <template #append><v-btn size="small" variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <v-card class="d-none d-md-block">
        <v-table>
          <caption class="visually-hidden">Plantillas de invitación</caption>
          <thead>
            <tr>
              <th scope="col">Plantilla</th>
              <th scope="col">Tipo de evento</th>
              <th scope="col">Versión publicada</th>
              <th scope="col">Borrador</th>
              <th scope="col" class="text-right">Eventos</th>
              <th scope="col"><span class="visually-hidden">Acciones</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in templates" :key="t.id">
              <th scope="row" class="name">
                <router-link :to="{ name: 'TemplateDetail', params: { id: t.id } }">{{ t.name }}</router-link>
                <v-chip v-if="!t.isActive" size="x-small" class="ml-2" variant="tonal">Inactiva</v-chip>
              </th>
              <td>{{ eventTypeLabel(t) }}</td>
              <td>{{ published(t) }}<span v-if="t.currentVersion?.publishedAt" class="text-medium-emphasis"> · {{ formatDate(t.currentVersion.publishedAt) }}</span></td>
              <td><v-chip v-if="t.draftVersionId" size="small" color="accent" variant="tonal" prepend-icon="mdi-pencil-outline">Tiene borrador</v-chip><span v-else class="text-medium-emphasis">No</span></td>
              <td class="text-right">{{ t.eventsCount }}</td>
              <td class="text-right"><v-btn size="small" variant="tonal" :to="{ name: 'TemplateDetail', params: { id: t.id } }">Abrir</v-btn></td>
            </tr>
          </tbody>
        </v-table>
      </v-card>

      <ul class="cards d-md-none">
        <li v-for="t in templates" :key="t.id">
          <v-card class="pa-4">
            <div class="d-flex align-start ga-2 mb-2">
              <router-link class="card-name" :to="{ name: 'TemplateDetail', params: { id: t.id } }">{{ t.name }}</router-link>
              <v-chip v-if="t.draftVersionId" size="small" color="accent" variant="tonal" class="ml-auto flex-none">Borrador</v-chip>
            </div>
            <dl class="facts">
              <dt>Tipo de evento</dt><dd>{{ eventTypeLabel(t) }}</dd>
              <dt>Publicada</dt><dd>{{ published(t) }}</dd>
              <dt>Eventos</dt><dd>{{ eventsLabel(t.eventsCount) }}</dd>
            </dl>
            <v-btn block variant="tonal" class="mt-3 tap" :to="{ name: 'TemplateDetail', params: { id: t.id } }">Abrir</v-btn>
          </v-card>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.intro { max-width: 70ch; }
.dim { opacity: 0.6; transition: opacity 0.15s ease-out; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.name { font-weight: 600; text-align: left; }
a { color: var(--rose-700); }
.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.card-name { font-weight: 600; font-size: 1.05rem; overflow-wrap: anywhere; }
.facts { display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; margin: 0; }
.facts dt { color: var(--ink-500); }
.facts dd { margin: 0; }
.tap { min-height: 44px; }
.flex-none { flex: none; }
</style>
