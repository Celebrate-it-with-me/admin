<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useCurrentUserStore } from '@/store/currentUser'
import { useLoader } from '../useLoader'
import { deleteFailedJob, fetchFailedJobs, retryFailedJob, retryFailedQueue } from '../services/healthApi'
import { agoFromDate, dateTime, plural, shortClass } from '../logic'
import { firstError } from '@/modules/revenue/logic'
import type { FailedJobItem } from '../types'
import HealthCard from './HealthCard.vue'

const me = useCurrentUserStore()
const canManage = computed(() => me.can('admin.system.manage'))

const { data, loading, failed, load } = useLoader(() => fetchFailedJobs(20))
onMounted(load)
defineExpose({ load })

const empty = computed(() => data.value?.total === 0)

type Pending = { kind: 'retry' | 'delete'; job: FailedJobItem } | { kind: 'queue'; queue: string; total: number }
const pending = ref<Pending | null>(null)
const open = ref(false)
const busy = ref(false)
const error = ref('')
const notice = ref('')

const ask = (p: Pending) => { pending.value = p; error.value = ''; open.value = true }
const dialog = computed(() => {
  const p = pending.value
  if (!p) return { title: '', message: '', confirm: 'Confirmar', danger: false }
  if (p.kind === 'queue') {
    return {
      title: `Reintentar la cola «${p.queue}»`,
      message: `Se vuelven a poner en cola hasta 50 trabajos fallidos de «${p.queue}», los más antiguos primero (hay ${p.total}). Si no alcanzan, repite la acción.`,
      confirm: 'Reintentar trabajos',
      danger: false,
    }
  }
  const name = shortClass(p.job.job)
  return p.kind === 'retry'
    ? { title: `Reintentar ${name}`, message: 'El trabajo vuelve a la cola y se ejecuta de nuevo. Si falla otra vez, regresa a esta lista.', confirm: 'Reintentar', danger: false }
    : { title: `Borrar ${name}`, message: 'El trabajo se descarta para siempre y no se ejecutará. Esta acción no se puede deshacer.', confirm: 'Borrar trabajo', danger: true }
})

const confirm = async (reason: string) => {
  const p = pending.value
  if (!p) return
  busy.value = true
  error.value = ''
  try {
    if (p.kind === 'queue') {
      const r = await retryFailedQueue(p.queue, reason)
      notice.value = r.retried
        ? `${plural(r.retried, 'trabajo vuelto a la cola', 'trabajos vueltos a la cola')}.${r.remaining ? ` Quedan ${r.remaining} en «${p.queue}».` : ''}`
        : 'No había trabajos que reintentar en esa cola.'
    } else if (p.kind === 'retry') {
      await retryFailedJob(p.job.uuid, reason)
      notice.value = `${shortClass(p.job.job)} volvió a la cola.`
    } else {
      await deleteFailedJob(p.job.uuid, reason)
      notice.value = `${shortClass(p.job.job)} se borró.`
    }
    open.value = false
    await load()
  } catch (e) {
    error.value = firstError(e, 'No pudimos completar la acción.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <HealthCard title="Trabajos fallidos" subtitle="Tareas en segundo plano que se rindieron (correos, recordatorios...)." icon="mdi-alert-octagon-outline"
    :loading="loading" :failed="failed" :ready="!!data" error-text="No pudimos cargar los trabajos fallidos." @retry="load">
    <template v-if="data">
      <div class="stats">
        <div><p class="stat__value">{{ data.total }}</p><p class="stat__label">en total</p></div>
        <div><p class="stat__value">{{ data.last24h }}</p><p class="stat__label">en las últimas 24 h</p></div>
        <div v-if="data.byQueue.length" class="stat__queues">
          <template v-for="q in data.byQueue" :key="q.queue">
            <v-chip v-if="!canManage" size="small" variant="outlined">{{ q.queue }} · {{ q.total }}</v-chip>
            <v-btn v-else size="small" variant="outlined" class="queue-btn" prepend-icon="mdi-restart" :aria-label="`Reintentar la cola ${q.queue} (${q.total} fallidos)`" @click="ask({ kind: 'queue', queue: q.queue, total: q.total })">{{ q.queue }} · {{ q.total }}</v-btn>
          </template>
        </div>
      </div>

      <v-alert v-if="notice" type="success" variant="tonal" density="comfortable" closable class="mb-4" :text="notice" @click:close="notice = ''" />

      <p v-if="empty" class="empty"><v-icon icon="mdi-check-circle-outline" color="success" size="20" aria-hidden="true" /> No hay trabajos fallidos. Todo en orden.</p>
      <template v-else>
        <p class="text-body-2 text-medium-emphasis mb-2">Los {{ plural(data.items.length, 'más reciente', 'más recientes') }}. Los mensajes se resumen y se limpian de correos, teléfonos y claves.</p>
        <ul class="list">
          <li v-for="j in data.items" :key="j.id" class="item">
            <div class="item__top">
              <strong class="item__job" :title="j.job ?? undefined">{{ shortClass(j.job) }}</strong>
              <v-chip size="x-small" variant="tonal">{{ j.queue }}</v-chip>
              <time class="item__when" :datetime="j.failedAt ?? undefined" :title="dateTime(j.failedAt)">{{ agoFromDate(j.failedAt) }}</time>
            </div>
            <div v-if="canManage" class="item__actions">
              <v-btn size="small" variant="tonal" class="touch" prepend-icon="mdi-restart" @click="ask({ kind: 'retry', job: j })">Reintentar</v-btn>
              <v-btn size="small" variant="text" color="error" class="touch" prepend-icon="mdi-delete-outline" @click="ask({ kind: 'delete', job: j })">Borrar</v-btn>
            </div>
            <p class="item__msg"><span v-if="j.exceptionClass" class="item__class">{{ shortClass(j.exceptionClass) }}:</span> {{ j.message || 'Sin mensaje' }}</p>
          </li>
        </ul>
      </template>
    </template>
  </HealthCard>

  <ReasonDialog v-model="open" :title="dialog.title" :message="dialog.message" :confirm-label="dialog.confirm" :danger="dialog.danger" :loading="busy" :error="error" @confirm="confirm" />
</template>

<style scoped>
.stats { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 8px 32px; margin-bottom: 16px; }
.stat__value { font-family: var(--font-heading); font-size: 2rem; line-height: 1.1; margin: 0; }
.stat__label { font-size: 0.8125rem; color: var(--ink-500); margin: 0; }
.stat__queues { display: flex; flex-wrap: wrap; gap: 6px; }
.empty { display: flex; align-items: center; gap: 8px; margin: 0; color: var(--ink-700); }
.list { list-style: none; margin: 0; padding: 0; }
.item { padding: 12px 0; border-top: 1px solid var(--line); }
.item__top { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.item__job { overflow-wrap: anywhere; }
.item__when { margin-left: auto; font-size: 0.8125rem; color: var(--ink-500); white-space: nowrap; }
.item__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.queue-btn { min-height: 36px; text-transform: none; letter-spacing: 0; }
.touch { min-height: 44px; }
.item__msg { margin: 4px 0 0; font-size: 0.875rem; color: var(--ink-700); overflow-wrap: anywhere; }
.item__class { font-weight: 600; }
</style>
