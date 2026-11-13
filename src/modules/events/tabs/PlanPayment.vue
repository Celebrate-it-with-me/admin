<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCurrentUserStore } from '@/store/currentUser'
import ReasonDialog from '@/components/ReasonDialog.vue'
import { formatMoney } from '@/composables/useMoney'
import { PLAN_COLOR } from '../labels'
import type { EventDetail } from '../types'
import { changePlan, fetchPurchases, markPaidByHand, refundPurchase } from '../plan/planApi'
import { explainError, usage, warningText } from '../plan/planLogic'
import type { EventPurchaseRow, PlanChangeResult } from '../plan/types'
import PurchaseList from '../plan/PurchaseList.vue'
import ManualPaymentDialog from '../plan/ManualPaymentDialog.vue'
import ChangePlanDialog from '../plan/ChangePlanDialog.vue'

// Receives the loaded event; emits `reload` after a change so the sheet refreshes.
const props = defineProps<{ detail: EventDetail }>()
const emit = defineEmits<{ reload: [] }>()

const me = useCurrentUserStore()
// Support sees the plan and its limit only: no purchases and no amounts.
const canSeePayments = computed(() => me.can('admin.purchases.manage'))
const canManual = computed(() => me.can('admin.purchases.manage'))
const canRefund = computed(() => me.can('admin.refunds'))
const canChangePlan = computed(() => me.can('admin.events.change_plan'))

const plan = computed(() => props.detail.plan)
const guests = computed(() => props.detail.counts.guests)
const use = computed(() => usage(guests.value, plan.value?.guestLimit ?? null))

const purchases = ref<EventPurchaseRow[]>([])
const loading = ref(false)
const failed = ref(false)
const loaded = ref(false)

let latest = 0
const load = async () => {
  if (!canSeePayments.value) return
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await fetchPurchases(props.detail.event.id)
    if (request === latest) { purchases.value = res.data; loaded.value = true }
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}
onMounted(load)
watch(() => props.detail.event.id, load)

const notice = ref<{ type: 'success' | 'warning'; text: string; items: string[] } | null>(null)
const done = async (text: string, items: string[] = []) => {
  notice.value = { type: items.length ? 'warning' : 'success', text, items }
  await load()
  emit('reload')
}

// ── mark paid by hand ──
const manualOpen = ref(false)
const manualBusy = ref(false)
const manualError = ref('')
const doManual = async (v: { amountCents: number; notes: string; reason: string }) => {
  manualBusy.value = true
  manualError.value = ''
  try {
    await markPaidByHand(props.detail.event.id, v.amountCents, v.notes, v.reason)
    manualOpen.value = false
    await done(`Pago de ${formatMoney(v.amountCents)} registrado. El evento ahora tiene el plan completo.`)
  } catch (e) { manualError.value = explainError(e) } finally { manualBusy.value = false }
}

// ── refund ──
const refunding = ref<EventPurchaseRow | null>(null)
const refundOpen = computed({ get: () => refunding.value !== null, set: (v: boolean) => { if (!v) refunding.value = null } })
const refundBusy = ref(false)
const refundError = ref('')
const askRefund = (p: EventPurchaseRow) => { refundError.value = ''; refunding.value = p }
const doRefund = async (reason: string) => {
  if (!refunding.value) return
  refundBusy.value = true
  refundError.value = ''
  try {
    await refundPurchase(refunding.value.id, reason)
    refunding.value = null
    await done('Compra reembolsada. El evento volvió al plan gratuito.')
  } catch (e) { refundError.value = explainError(e) } finally { refundBusy.value = false }
}

// ── change plan ──
const planOpen = ref(false)
const planBusy = ref(false)
const planError = ref('')
const doPlan = async (v: { planSlug: string; reason: string }) => {
  planBusy.value = true
  planError.value = ''
  try {
    const res: PlanChangeResult = await changePlan(props.detail.event.id, v.planSlug, v.reason)
    planOpen.value = false
    await done(`Plan cambiado a ${res.plan.name}.`, res.warnings.map(warningText).filter(Boolean))
  } catch (e) { planError.value = explainError(e) } finally { planBusy.value = false }
}
</script>

<template>
  <div>
    <div aria-live="polite">
      <v-alert v-if="notice" :type="notice.type" variant="tonal" closable class="mb-4" @click:close="notice = null">
        {{ notice.text }}
        <ul v-if="notice.items.length" class="notice-list"><li v-for="i in notice.items" :key="i">{{ i }}</li></ul>
      </v-alert>
    </div>

    <v-card class="pa-5 mb-4">
      <div class="head">
        <h3 class="text-h6">Plan del evento</h3>
        <v-btn v-if="canChangePlan && plan" variant="outlined" prepend-icon="mdi-swap-horizontal" class="btn" @click="planError = ''; planOpen = true">Cambiar plan</v-btn>
      </div>
      <template v-if="plan">
        <p class="mt-2">
          <v-chip :color="PLAN_COLOR[plan.slug] ?? 'secondary'" variant="tonal" size="small">{{ plan.name }}</v-chip>
          <span class="ml-2">{{ use.unlimited ? 'Sin límite de invitados' : `Hasta ${plan.guestLimit} invitados` }}</span>
        </p>
        <div class="mt-3">
          <p class="text-body-2">
            <strong>{{ guests }}</strong> invitados cargados<template v-if="!use.unlimited"> de {{ plan.guestLimit }}</template>
          </p>
          <v-progress-linear v-if="!use.unlimited" :model-value="use.percent" :color="use.over ? 'error' : 'primary'" bg-color="surface-variant" height="10" rounded class="my-2" :aria-label="`${guests} de ${plan.guestLimit} invitados`" />
          <v-alert v-if="use.over" type="warning" variant="tonal" density="compact" class="mt-2" text="La lista supera el límite del plan: no se podrá publicar ni agregar más invitados hasta resolverlo." />
        </div>
      </template>
      <p v-else class="text-medium-emphasis mt-2">Este evento no tiene plan asignado.</p>
    </v-card>

    <v-card v-if="canSeePayments" class="pa-5">
      <div class="head">
        <h3 class="text-h6">Compras</h3>
        <v-btn v-if="canManual" color="primary" prepend-icon="mdi-cash-plus" class="btn" @click="manualError = ''; manualOpen = true">Marcar pagado a mano</v-btn>
      </div>

      <div v-if="loading && !loaded" class="mt-3" aria-busy="true"><v-skeleton-loader type="list-item-two-line, list-item-two-line" /></div>
      <v-alert v-else-if="failed" type="error" variant="tonal" class="mt-3" text="No pudimos cargar las compras.">
        <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
      </v-alert>
      <p v-else-if="!purchases.length" class="text-medium-emphasis mt-3">Este evento no tiene compras. Si el pago llegó por Zelle u otro medio, regístralo con "Marcar pagado a mano".</p>
      <div v-else class="mt-2" :class="{ dim: loading }">
        <PurchaseList :purchases="purchases" :can-refund="canRefund" @refund="askRefund" />
      </div>
    </v-card>

    <ManualPaymentDialog v-model="manualOpen" :loading="manualBusy" :error="manualError" @confirm="doManual" />
    <ChangePlanDialog v-model="planOpen" :loading="planBusy" :error="planError" :current-slug="plan?.slug ?? null" :guests="guests" @confirm="doPlan" />
    <ReasonDialog
      v-model="refundOpen"
      title="Reembolsar esta compra"
      :message="refunding ? `Se devuelve el importe completo (${formatMoney(refunding.amountCents ?? 0, refunding.currency ?? 'USD')}) y el evento vuelve al plan gratuito. Solo es posible mientras la invitación no esté publicada.` : ''"
      confirm-label="Reembolsar"
      danger
      :loading="refundBusy"
      :error="refundError"
      @confirm="doRefund"
    />
  </div>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; }
.btn { min-height: 44px; }
.dim { opacity: 0.55; transition: opacity 0.15s ease-out; }
.notice-list { margin: 6px 0 0 18px; }
</style>
