<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { useCurrentUserStore } from '@/store/currentUser'
import { fetchPurchase, refundPurchase, resolveReview, syncPurchase } from '../services/revenueApi'
import type { PurchaseDetail } from '../types'
import { STATUS as INVOICE_STATUS } from '@/modules/invoices/logic'
import { EVENT_STATUS, GATEWAY, STATUS, actionError, canSync, dateTimeLabel, disputeIsOpen, disputeLabel, money, refundBlockReason } from '../logic'

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
const syncOpen = ref(false)
const syncing = ref(false)
const syncFailure = ref('')
const reviewOpen = ref(false)
const resolving = ref(false)
const reviewFailure = ref('')

const open = computed(() => props.purchaseId !== null)
const drawerWidth = computed(() => (smAndDown.value ? width.value : 460))
const blocked = computed(() => (detail.value ? refundBlockReason(detail.value) : null))
const canRefund = computed(() => detail.value?.status === 'paid' && detail.value.canRefund && user.can('admin.refunds'))
const canManage = computed(() => user.can('admin.purchases.manage'))
const showSync = computed(() => Boolean(detail.value && canSync(detail.value) && canManage.value))
const showResolve = computed(() => Boolean(detail.value?.needsReview && canManage.value))
const dispute = computed(() => disputeLabel(detail.value?.disputeStatus ?? null))
const disputeOpen = computed(() => disputeIsOpen(detail.value?.disputeStatus ?? null))
// A failure of Stripe or of a sync can leave an alert that is no longer true once the purchase reloads.
const anyFailure = computed(() => [refundFailure.value, syncFailure.value, reviewFailure.value].find(Boolean) ?? '')

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
  syncFailure.value = ''
  reviewFailure.value = ''
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
    refundFailure.value = actionError(e, 'No pudimos reembolsar. Intenta de nuevo.')
    // The list may be out of date (the event was published meanwhile): show the real state.
    await load()
  } finally {
    refunding.value = false
  }
}

const confirmSync = async (reason: string) => {
  if (!detail.value) return
  syncing.value = true
  syncFailure.value = ''
  try {
    await syncPurchase(detail.value.id, reason)
    syncOpen.value = false
    done.value = 'Compra conciliada con Stripe.'
    emit('changed')
    await load()
  } catch (e) {
    syncFailure.value = actionError(e, 'No pudimos conciliar con Stripe. Intenta de nuevo.')
  } finally {
    syncing.value = false
  }
}

const confirmResolve = async (reason: string) => {
  if (!detail.value) return
  resolving.value = true
  reviewFailure.value = ''
  try {
    await resolveReview(detail.value.id, reason)
    reviewOpen.value = false
    done.value = 'Marcada como revisada.'
    emit('changed')
    await load()
  } catch (e) {
    reviewFailure.value = actionError(e, 'No pudimos marcarla como revisada. Intenta de nuevo.')
  } finally {
    resolving.value = false
  }
}

const STEP_LABEL: Record<string, string> = { created: 'Compra creada', paid: 'Pago confirmado', refunded: 'Reembolsada', disputed: 'Disputa abierta', chargeback: 'Contracargo' }
const STEP_COLOR: Record<string, string> = { created: 'secondary', paid: 'success', refunded: 'warning', disputed: 'warning', chargeback: 'error' }
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
        <v-alert v-if="anyFailure && !refundOpen && !syncOpen && !reviewOpen" type="error" variant="tonal" density="compact" class="mt-4" :text="anyFailure" role="alert" />

        <v-alert v-if="detail.needsReview" type="warning" variant="tonal" density="compact" class="mt-4" title="Necesita revisión" role="status">
          Algo de esta compra no cuadra con Stripe (por ejemplo, un reembolso o una disputa con la invitación ya publicada). Revisa el pago en Stripe y, cuando esté resuelto, márcala como revisada.
        </v-alert>
        <v-alert
          v-if="dispute"
          :type="disputeOpen ? 'warning' : detail.status === 'chargeback' ? 'error' : 'info'"
          variant="tonal"
          density="compact"
          class="mt-4"
          :title="dispute.label"
          role="status"
        >
          <template v-if="detail.disputedAt">Abierta el {{ dateTimeLabel(detail.disputedAt) }}. </template>
          <template v-if="disputeOpen">El plan sigue activo durante la disputa. La evidencia se envía a mano desde el panel de Stripe.</template>
          <template v-else-if="detail.status === 'chargeback'">El banco resolvió a favor de la compradora y el dinero ya salió.</template>
        </v-alert>

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
          <template v-if="detail.gatewayPaymentId">
            <dt>Pago</dt><dd class="mono">{{ detail.gatewayPaymentId }}</dd>
          </template>
          <template v-if="detail.gatewayRefundId">
            <dt>Reembolso</dt><dd class="mono">{{ detail.gatewayRefundId }}</dd>
          </template>
          <template v-if="detail.disputeId">
            <dt>Disputa</dt><dd class="mono">{{ detail.disputeId }}</dd>
          </template>
          <template v-if="detail.failureCode">
            <dt>Fallo</dt><dd class="mono">{{ detail.failureCode }}</dd>
          </template>
          <template v-if="detail.taxCents > 0">
            <dt>Impuestos</dt><dd>{{ money(detail.taxCents, detail.currency) }}</dd>
          </template>
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

        <h4 class="detail__h mt-6">Facturas</h4>
        <p v-if="!detail.invoices.length" class="text-body-2 text-medium-emphasis mt-2">Esta compra no tiene factura.</p>
        <ul v-else class="docs mt-2" aria-label="Facturas y notas de crédito de la compra">
          <li v-for="inv in detail.invoices" :key="inv.id">
            <router-link class="docs__link touch" :to="{ name: 'Invoices', query: { invoice: inv.id } }">
              <v-icon icon="mdi-file-document-outline" size="small" aria-hidden="true" />
              <span class="docs__num">{{ inv.number }}</span>
              <v-chip :color="INVOICE_STATUS[inv.status].color" variant="tonal" size="x-small">{{ INVOICE_STATUS[inv.status].label }}</v-chip>
            </router-link>
            <ul v-if="inv.creditNotes.length" class="docs__notes">
              <li v-for="note in inv.creditNotes" :key="note.id">
                <router-link class="docs__link touch" :to="{ name: 'Invoices', query: { invoice: inv.id } }">
                  <v-icon icon="mdi-file-undo-outline" size="small" aria-hidden="true" />
                  <span class="docs__num">{{ note.number }}</span>
                  <span class="text-body-2 text-medium-emphasis">Nota de crédito · -{{ money(note.amountCents, note.currency) }}</span>
                </router-link>
              </li>
            </ul>
          </li>
        </ul>

        <v-btn
          v-if="detail.stripeUrl"
          class="mt-5 touch"
          variant="outlined"
          block
          :href="detail.stripeUrl"
          target="_blank"
          rel="noopener noreferrer"
          prepend-icon="mdi-open-in-new"
        >Ver en Stripe</v-btn>
        <v-btn
          v-if="showSync"
          class="mt-3 touch"
          variant="tonal"
          block
          prepend-icon="mdi-sync"
          @click="syncFailure = ''; syncOpen = true"
        >Conciliar con Stripe</v-btn>
        <v-btn
          v-if="showResolve"
          class="mt-3 touch"
          color="warning"
          variant="tonal"
          block
          prepend-icon="mdi-check-decagram-outline"
          @click="reviewFailure = ''; reviewOpen = true"
        >Marcar revisado</v-btn>

        <v-alert v-if="blocked" type="info" variant="tonal" density="compact" class="mt-4" :text="blocked" />
        <v-btn
          v-if="canRefund"
          class="mt-3 touch"
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

    <ReasonDialog
      v-model="syncOpen"
      title="Conciliar con Stripe"
      message="Se compara esta compra con Stripe (sesión, pago, reembolso y disputa) y se aplica lo que falte. No cobra ni reembolsa nada."
      confirm-label="Conciliar"
      :loading="syncing"
      :error="syncFailure"
      @confirm="confirmSync"
    />

    <ReasonDialog
      v-model="reviewOpen"
      title="Marcar como revisada"
      message="Confirma que ya revisaste esta compra en Stripe. Solo quita la marca de revisión; no cambia el pago ni el plan del evento."
      confirm-label="Marcar revisado"
      :loading="resolving"
      :error="reviewFailure"
      @confirm="confirmResolve"
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
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem; }
.notes { font-weight: 400 !important; white-space: pre-wrap; }
.detail__h { font-size: 0.75rem; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; }
.timeline { margin-left: -16px; }
.step__title { font-weight: 600; margin: 0; }
.timeline :deep(.v-timeline-item) { min-height: 0; padding-bottom: 12px; }
.timeline :deep(.v-timeline-item__body) { padding-block: 0; }
.kv a { color: var(--rose-700); text-underline-offset: 2px; }
.kv a:hover { color: var(--wine-800); }
.docs, .docs__notes { list-style: none; margin: 0; padding: 0; }
.docs__notes { padding-left: 24px; }
.docs__link { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--rose-700); text-underline-offset: 2px; }
.docs__link:hover { color: var(--wine-800); }
.docs__num { font-weight: 600; }
.touch { min-height: 44px; }
</style>
