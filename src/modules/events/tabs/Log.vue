<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import Pager from '../actions/Pager.vue'
import { fetchLog, type ActivityItem, type Meta, type StaffItem } from '../actions/api'
import { staffActionLabel, staffDetail } from '../actions/logic'
import { activityLabel, dateLabel } from '../labels'
import type { EventDetail } from '../types'

const props = defineProps<{ detail: EventDetail }>()
defineEmits<{ reload: [] }>()

const store = useCurrentUserStore()
const canStaff = computed(() => store.can('admin.audit.view'))
const id = computed(() => props.detail.event.id)

const source = ref<'activity' | 'staff'>('activity')
const activity = ref<ActivityItem[]>([])
const staff = ref<StaffItem[]>([])
const meta = ref<Meta | null>(null)
const page = ref(1)
const loading = ref(true)
const failed = ref(false)

let latest = 0
async function load() {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    if (source.value === 'staff') {
      const r = await fetchLog<StaffItem>(id.value, 'staff', page.value)
      if (request !== latest) return
      staff.value = r.data; meta.value = r.meta
    } else {
      const r = await fetchLog<ActivityItem>(id.value, 'activity', page.value)
      if (request !== latest) return
      activity.value = r.data; meta.value = r.meta
    }
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
watch(source, () => { page.value = 1; meta.value = null; load() }, { immediate: true })
watch(id, () => { page.value = 1; load() })
const goto = (p: number) => { page.value = p; load() }

const rows = computed(() => (source.value === 'staff' ? staff.value.length : activity.value.length))

/** Who did it, as the timeline words it: staff work reads as "Soporte", the organizer by name. */
const who = (a: ActivityItem) => (a.byStaff ? 'Soporte' : (a.actor?.name ?? 'Sistema'))
const detailOf = (a: ActivityItem) => {
  const p = a.payload
  const name = (p.name ?? p.title) as string | undefined
  return name ? `«${name}»` : ''
}
</script>

<template>
  <div>
    <v-btn-toggle v-if="canStaff" v-model="source" mandatory color="primary" variant="outlined" density="comfortable" class="mb-4 toggle" aria-label="Qué registro ver">
      <v-btn value="activity" class="btn">Actividad del evento</v-btn>
      <v-btn value="staff" class="btn">Acciones del personal</v-btn>
    </v-btn-toggle>

    <v-card class="pa-4" :aria-busy="loading">
      <v-skeleton-loader v-if="loading && !rows" type="list-item-two-line, list-item-two-line, list-item-two-line" />

      <v-alert v-else-if="failed" type="error" variant="tonal" text="No pudimos cargar el registro.">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <p v-else-if="!rows" class="text-medium-emphasis pa-4 text-center">
        {{ source === 'staff' ? 'El personal todavía no ha hecho nada en este evento.' : 'Todavía no hay actividad registrada.' }}
      </p>

      <ol v-else-if="source === 'activity'" class="timeline" :class="{ dim: loading }" aria-label="Actividad del evento">
        <li v-for="a in activity" :key="a.id">
          <p>{{ activityLabel(a.type) }} <span class="text-medium-emphasis">{{ detailOf(a) }}</span></p>
          <p class="text-caption text-medium-emphasis">{{ who(a) }} · {{ dateLabel(a.createdAt, true) }}</p>
        </li>
      </ol>

      <ol v-else class="timeline" :class="{ dim: loading }" aria-label="Acciones del personal">
        <li v-for="s in staff" :key="s.id">
          <p>{{ staffActionLabel(s.action) }} <span class="text-medium-emphasis">{{ staffDetail(s.action, s.before, s.after) }}</span></p>
          <p v-if="s.reason" class="reason">Motivo: {{ s.reason }}</p>
          <p class="text-caption text-medium-emphasis">{{ s.actor?.name ?? 'Personal' }}<template v-if="s.impersonated"> (suplantando)</template> · {{ dateLabel(s.createdAt, true) }}</p>
        </li>
      </ol>
    </v-card>

    <Pager :meta="meta" :disabled="loading" @page="goto" />
  </div>
</template>

<style scoped>
.toggle { flex-wrap: wrap; height: auto; }
.btn { min-height: 44px; }
.dim { opacity: 0.55; transition: opacity 0.15s ease-out; }
.timeline { list-style: none; margin: 0; padding: 0 0 0 18px; border-left: 2px solid var(--line); display: flex; flex-direction: column; gap: 16px; }
.timeline li { position: relative; overflow-wrap: anywhere; }
.timeline li::before { content: ''; position: absolute; left: -24px; top: 7px; width: 10px; height: 10px; border-radius: 50%; background: var(--rose-600); }
.reason { font-size: 0.875rem; color: var(--ink-700); }
</style>
