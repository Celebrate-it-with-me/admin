<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { API } from '@/services/axios'
import type { AuditEntry, TeamMember } from '@/types'
import { ACTION_FILTERS, actionLabel, fieldLine, whenLabel } from '@/composables/useAuditLabels'

type Row = AuditEntry & { key: string }
const { smAndDown } = useDisplay()
const rows = ref<Row[]>([])
const total = ref(0)
const page = ref(1)
const perPage = ref(25)
const loading = ref(true)
const failed = ref(false)
const expanded = ref<string[]>([])

const actors = ref<TeamMember[]>([])
const filters = ref({ actor: null as number | null, action: null as string | null, event: '', user: '', from: '', to: '' })
const hasFilters = computed(() => Object.values(filters.value).some(v => v !== null && v !== ''))

let latest = 0
const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  const f = filters.value
  try {
    const res = await API.get('audit', {
      params: {
        page: page.value, perPage: perPage.value,
        actor: f.actor || undefined, action: f.action || undefined,
        event: f.event || undefined, user: f.user || undefined,
        from: f.from || undefined, to: f.to || undefined,
      },
    })
    if (request !== latest) return
    rows.value = (res.data.data as AuditEntry[]).map(r => ({ ...r, key: String(r.id) }))
    total.value = res.data.meta.total
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

onMounted(async () => {
  try { actors.value = (await API.get('team')).data.data } catch { /* the filter just has no names */ }
  load()
})

// Changing a filter goes back to the first page.
watch(filters, () => { page.value = 1; load() }, { deep: true })
watch([page, perPage], load)

const clear = () => { filters.value = { actor: null, action: null, event: '', user: '', from: '', to: '' } }

// On a phone the table keeps three columns: when, what (with who) and the expand arrow; the rest is in the detail.
const headers = computed(() => smAndDown.value ? [
  { title: 'Cuándo', key: 'createdAt', sortable: false },
  { title: 'Qué hizo', key: 'action', sortable: false },
  { title: '', key: 'data-table-expand', sortable: false },
] : fullHeaders)
const fullHeaders = [
  { title: 'Cuándo', key: 'createdAt', sortable: false },
  { title: 'Quién', key: 'actor', sortable: false },
  { title: 'Qué hizo', key: 'action', sortable: false },
  { title: 'Sobre', key: 'about', sortable: false },
  { title: 'Motivo', key: 'reason', sortable: false },
  { title: '', key: 'data-table-expand', sortable: false },
]

const about = (r: Row) => {
  const parts: string[] = []
  if (r.event) parts.push(r.event.name ? `${r.event.name} (evento #${r.event.id})` : `Evento #${r.event.id}`)
  if (r.user) parts.push(r.user.name ? `${r.user.name}${r.user.email ? ` · ${r.user.email}` : ''}` : `Cuenta #${r.user.id}`)
  return parts.join(' — ') || '—'
}
const lines = (data: Record<string, unknown> | null) => Object.entries(data ?? {}).map(([k, v]) => fieldLine(k, v))
const toggle = (key: string) => { expanded.value = expanded.value.includes(key) ? expanded.value.filter(x => x !== key) : [key] }
</script>

<template>
  <section>
    <header class="mb-6">
      <h2 class="title">Auditoría</h2>
      <p class="text-medium-emphasis">Todo lo que hace el personal en el panel: quién, a quién, cuándo y por qué. Se conserva 2 años y no se puede editar.</p>
    </header>

    <v-card class="pa-4 mb-4">
      <v-row dense>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="filters.actor" :items="actors" item-title="name" item-value="key" label="Quién" clearable hide-details />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select v-model="filters.action" :items="ACTION_FILTERS" label="Tipo de acción" clearable hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="filters.event" label="ID del evento" inputmode="numeric" clearable hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="filters.user" label="ID de la cuenta" inputmode="numeric" clearable hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="filters.from" label="Desde" type="date" hide-details />
        </v-col>
        <v-col cols="6" md="3">
          <v-text-field v-model="filters.to" label="Hasta" type="date" hide-details />
        </v-col>
        <v-col cols="12" md="6" class="d-flex align-center justify-end">
          <v-btn v-if="hasFilters" variant="text" prepend-icon="mdi-filter-off-outline" @click="clear">Quitar filtros</v-btn>
        </v-col>
      </v-row>
    </v-card>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-4" text="No pudimos cargar la auditoría.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <v-card class="table-card" :class="{ 'is-loading': loading && rows.length }">
      <v-data-table-server
        v-model:page="page"
        v-model:items-per-page="perPage"
        :headers="headers"
        :items="rows"
        :items-length="total"
        :loading="loading && !rows.length"
        :expanded="expanded"
        item-value="key"
        show-expand
        :items-per-page-options="[10, 25, 50, 100]"
        items-per-page-text="Por página"
        no-data-text="No hay registros con estos filtros."
        loading-text="Cargando…"
        hover
        @click:row="(_: Event, { item }: { item: Row }) => toggle(item.key)"
      >
        <template #item.createdAt="{ item }"><span class="nowrap">{{ whenLabel(item.createdAt, smAndDown) }}</span></template>
        <template #item.actor="{ item }">
          <div v-if="item.actor"><strong>{{ item.actor.name }}</strong><br><span class="text-caption text-medium-emphasis">{{ item.actor.email }}</span></div>
          <span v-else class="text-medium-emphasis">Sistema</span>
        </template>
        <template #item.action="{ item }">
          <p v-if="smAndDown" class="who"><strong>{{ item.actor?.name ?? 'Sistema' }}</strong></p>
          <v-chip :color="actionLabel(item.action).tone" variant="tonal" size="small" :prepend-icon="actionLabel(item.action).icon">{{ actionLabel(item.action).label }}</v-chip>
        </template>
        <template #item.about="{ item }"><span class="about">{{ about(item) }}</span></template>
        <template #item.reason="{ item }"><span class="reason">{{ item.reason ?? '—' }}</span></template>

        <template #expanded-row="{ item, columns }">
          <tr class="detail">
            <td :colspan="columns.length">
              <v-row dense>
                <v-col cols="12" md="4">
                  <template v-if="smAndDown">
                    <p class="detail__h">Sobre</p>
                    <p class="text-body-2 mb-3">{{ about(item) }}</p>
                  </template>
                  <p class="detail__h">Motivo</p>
                  <p>{{ item.reason ?? 'Sin motivo (acción que no lo pide).' }}</p>
                  <p class="detail__h mt-3">Desde</p>
                  <p class="text-body-2">IP {{ item.ip ?? '—' }}<span v-if="item.impersonatedBy"> · en nombre de la cuenta #{{ item.impersonatedBy }}</span></p>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <p class="detail__h">Antes</p>
                  <dl v-if="lines(item.before).length" class="kv"><template v-for="l in lines(item.before)" :key="l.label"><dt>{{ l.label }}</dt><dd>{{ l.text }}</dd></template></dl>
                  <p v-else class="text-medium-emphasis">—</p>
                </v-col>
                <v-col cols="12" sm="6" md="4">
                  <p class="detail__h">Después</p>
                  <dl v-if="lines(item.after).length" class="kv"><template v-for="l in lines(item.after)" :key="l.label"><dt>{{ l.label }}</dt><dd>{{ l.text }}</dd></template></dl>
                  <p v-else class="text-medium-emphasis">—</p>
                </v-col>
              </v-row>
            </td>
          </tr>
        </template>
      </v-data-table-server>
    </v-card>
  </section>
</template>

<style scoped>
.title { font-size: 2rem; margin-bottom: 4px; }
.table-card { overflow: hidden; }
.table-card :deep(.v-table__wrapper) { overflow-x: auto; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; }
.nowrap { white-space: nowrap; }
.who { margin: 0 0 4px; font-size: 0.875rem; }
.detail p { overflow-wrap: anywhere; }
.about, .reason { display: inline-block; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: bottom; }
.detail { background: var(--cream-100); }
.detail td { padding: 16px 24px !important; }
.detail__h { font-size: 0.75rem; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; }
.kv { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 0; }
.kv dt { color: var(--ink-500); }
.kv dd { margin: 0; font-weight: 600; }
</style>
