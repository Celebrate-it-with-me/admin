<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useCurrentUserStore } from '@/store/currentUser'
import { fetchPurchase, refundPurchase } from '../services/revenueApi'
import type { PurchaseDetail } from '../types'
import { EVENT_STATUS, GATEWAY, STATUS, dateTimeLabel, firstError, money, refundBlockReason, refundError, validationCodes } from '../logic'

const props = defineProps<{ purchaseId: number | null }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const { smAndDown, width } = useDisplay()
const user = useCurrentUserStore()

const detail = ref<PurchaseDetail | null>(null)
const loading = ref(false)
const failed = ref(false)
const refundOpen = ref(false)
const refunding = ref(false)
const refundFailure = ref('')
const done = ref('')

const open = computed(() => props.purchaseId !== null)
const drawerWidth = computed(() => (smAndDown.value ? width.value : 460))
const blocked = computed(() => (detail.value ? refundBlockReason(detail.value) : null))
const canRefund = computed(() => detail.value?.status === 'paid' && detail.value.canRefund && user.can('admin.refunds'))

let latest = 0
const load = async () => {
  if (props.purchaseId === null) return
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchPurchase(props.purchaseId)
    if (request === latest) detail.value = res
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

watch(() => props.purchaseId, id => {
  detail.value = null
  done.value = ''
  refundFailure.value = ''
  if (id !== null) load()
}, { immediate: true })

const confirmRefund = async (reason: string) => {
  if (!detail.value) return
  refunding.value = true
  refundFailure.value = ''
  try {
    await refundPurchase(detail.value.id, reason)
    refundOpen.value = false
    done.value = 'Reembolso registrado. El evento volvió al plan gratis.'
    emit('changed')
    await load()
  } catch (e) {
    refundFailure.value = refundError(validationCodes(e, 'purchase'), firstError(e, 'No pudimos reembolsar. Intenta de nuevo.'))
    // The list may be out of date (the event was published meanwhile): show the real state.
    await load()
  } finally {
    refunding.value = false
  }
}

const STEP_LABEL = { created: 'Compra creada', paid: 'Pago confirmado', refunded: 'Reembolsada' } as const
const STEP_COLOR = { created: 'secondary', paid: 'success', refunded: 'warning' } as const
</script>

<template>
  <v-navigation-drawer
    :model-value="open"
    location="right"
    temporary
    tag="aside"
    :width="drawerWidth"
    aria-label="Detalle de la compra"
    @update:model-value="(v: boolean) => { if (!v) emit('close') }"
  >
    <div class="detail">
      <header class="detail__head">
        <h3 class="detail__title">Compra #{{ purchaseId }}</h3>
        <v-btn icon="mdi-close" variant="text" aria-label="Cerrar el detalle" @click="emit('close')" />
      </header>

      <div v-if="loading && !detail" class="pa-6" aria-busy="true">
        <v-skeleton-loader type="heading, paragraph, paragraph, list-item-two-line@3" />
      </div>

      <v-alert v-else-if="failed && !detail" type="error" variant="tonal" class="ma-4" text="No pudimos cargar la compra.">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>

      <div v-else-if="detail" class="detail__body" :class="{ 'is-loading': loading }">
        <div class="d-flex align-center ga-3 mb-1 flex-wrap">
          <v-chip :color="STATUS[detail.status].color" variant="tonal" :prepend-icon="STATUS[detail.status].icon">{{ STATUS[detail.status].label }}</v-chip>
          <v-chip v-if="detail.isFounder" color="primary" variant="tonal" size="small" prepend-icon="mdi-star-outline">Fundador</v-chip>
        </div>
        <p class="amount">{{ money(detail.amountCents, detail.currency) }}</p>
        <p v-if="detail.discountCents > 0" class="text-body-2 text-medium-emphasis">
          Precio de lista {{ money(detail.listPriceCents, detail.currency) }} · descuento {{ money(detail.discountCents, detail.currency) }}
        </p>

        <v-alert v-if="done" type="success" variant="tonal" density="compact" class="mt-4" :text="done" role="status" />
        <v-alert v-if="refundFailure && !refundOpen" type="error" variant="tonal" density="compact" class="mt-4" :text="refundFailure" role="alert" />

        <dl class="kv mt-5">
          <dt>Evento</dt>
          <dd>
            <router-link v-if="detail.event" :to="`/dashboard/events/${detail.event.id}`">{{ detail.event.name }}</router-link>
            <span v-else>—</span>
            <span v-if="detail.event" class="text-medium-emphasis"> · {{ EVENT_STATUS[detail.event.status] ?? detail.event.status }}</span>
          </dd>
          <dt>Compradora</dt>
          <dd>
            <template v-if="detail.buyer">{{ detail.buyer.name }}<br><span class="text-body-2 text-medium-emphasis">{{ detail.buyer.email }}</span></template>
            <template v-else>—</template>
          </dd>
          <dt>Plan</dt><dd>{{ detail.plan?.name ?? '—' }}</dd>
          <dt>Pasarela</dt><dd>{{ GATEWAY[detail.gateway] ?? detail.gateway }}<span v-if="detail.gatewayRef" class="text-medium-emphasis"> · ref. {{ detail.gatewayRef }}</span></dd>
          <dt>Código</dt><dd>{{ detail.coupon?.code ?? '—' }}</dd>
          <template v-if="detail.registeredBy">
            <dt>Registró el pago</dt><dd>{{ detail.registeredBy.name }}</dd>
          </template>
          <template v-if="detail.notes">
            <dt>Notas</dt><dd class="notes">{{ detail.notes }}</dd>
          </template>
        </dl>

        <h4 class="detail__h mt-6">Línea de tiempo</h4>
        <v-timeline density="compact" side="end" align="start" class="timeline">
          <v-timeline-item v-for="step in detail.timeline" :key="step.type" :dot-color="STEP_COLOR[step.type]" size="x-small">
            <p class="step__title">{{ STEP_LABEL[step.type] }}</p>
            <p class="text-body-2 text-medium-emphasis">
              {{ dateTimeLabel(step.at) }}<span v-if="step.by"> · registrado por {{ step.by.name }}</span>
            </p>
          </v-timeline-item>
        </v-timeline>

        <v-alert v-if="blocked" type="info" variant="tonal" density="compact" class="mt-4" :text="blocked" />
        <v-btn
          v-if="canRefund"
          class="mt-5 touch"
          color="error"
          variant="tonal"
          block
          prepend-icon="mdi-undo-variant"
          @click="refundFailure = ''; refundOpen = true"
        >Reembolsar</v-btn>
      </div>
    </div>

    <ReasonDialog
      v-model="refundOpen"
      title="Reembolsar esta compra"
      :message="`Se devuelve el total (${detail ? money(detail.amountCents, detail.currency) : ''}) y el evento vuelve al plan gratis. Solo es posible mientras la invitación no esté publicada.`"
      confirm-label="Reembolsar"
      :loading="refunding"
      :error="refundFailure"
      danger
      @confirm="confirmRefund"
    />
  </v-navigation-drawer>
</template>

<style scoped>
.detail { display: flex; flex-direction: column; min-height: 100%; }
.detail__head { display: flex; align-items: center; justify-content: space-between; padding: 12px 8px 12px 24px; border-bottom: 1px solid var(--line); }
.detail__title { font-size: 1.375rem; }
.detail__body { padding: 20px 24px 32px; transition: opacity 0.15s ease-out; }
.is-loading { opacity: 0.55; }
.amount { font-family: var(--font-heading); font-size: 2.5rem; line-height: 1.1; margin: 8px 0 4px; }
.kv { display: grid; grid-template-columns: 110px 1fr; gap: 12px 16px; margin: 0; }
.kv dt { color: var(--ink-500); font-size: 0.875rem; }
.kv dd { margin: 0; font-weight: 600; overflow-wrap: anywhere; }
.kv dd .text-medium-emphasis { font-weight: 400; }
.notes { font-weight: 400 !important; white-space: pre-wrap; }
.detail__h { font-size: 0.75rem; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; }
.timeline { margin-left: -16px; }
.step__title { font-weight: 600; margin: 0; }
.timeline :deep(.v-timeline-item) { min-height: 0; padding-bottom: 12px; }
.timeline :deep(.v-timeline-item__body) { padding-block: 0; }
.kv a { color: var(--rose-700); text-underline-offset: 2px; }
.kv a:hover { color: var(--wine-800); }
.touch { min-height: 44px; }
</style>
