<script setup lang="ts">
import { formatMoney } from '@/composables/useMoney'
import { dateLabel, purchaseTone } from '../labels'
import { gatewayLabel, REFUND_BLOCKED } from './planLogic'
import type { EventPurchaseRow } from './types'

defineProps<{ purchases: EventPurchaseRow[]; canRefund: boolean }>()
defineEmits<{ refund: [EventPurchaseRow] }>()

const money = (cents: number | null, currency: string | null) => (cents == null ? '—' : formatMoney(cents, currency ?? 'USD'))
</script>

<template>
  <ul class="list" aria-label="Compras del evento">
    <li v-for="p in purchases" :key="p.id" class="row">
      <div class="main">
        <div class="top">
          <v-chip v-if="purchaseTone(p.status)" :color="purchaseTone(p.status)!.color" variant="tonal" size="small" :prepend-icon="purchaseTone(p.status)!.icon">{{ purchaseTone(p.status)!.label }}</v-chip>
          <strong class="amount">{{ money(p.amountCents, p.currency) }}</strong>
          <span v-if="p.listPriceCents != null && p.listPriceCents !== p.amountCents" class="text-caption text-medium-emphasis">precio de lista {{ money(p.listPriceCents, p.currency) }}</span>
        </div>
        <p class="text-body-2">
          {{ gatewayLabel(p.gateway) }}<template v-if="p.plan"> · plan {{ p.plan.name }}</template>
          <template v-if="p.coupon"> · cupón <code>{{ p.coupon }}</code></template><template v-if="p.isFounder"> · fundador</template>
        </p>
        <p class="text-caption text-medium-emphasis">
          {{ p.status === 'refunded' && p.refundedAt ? `Reembolsada el ${dateLabel(p.refundedAt, true)}` : p.paidAt ? `Pagada el ${dateLabel(p.paidAt, true)}` : `Creada el ${dateLabel(p.createdAt, true)}` }}
          <template v-if="p.buyer"> · compradora: {{ p.buyer.name }}</template>
          <template v-if="p.registeredBy"> · registrada por {{ p.registeredBy.name }}</template>
        </p>
        <p v-if="p.notes" class="text-caption">Nota: {{ p.notes }}</p>
      </div>
      <div v-if="canRefund && p.status === 'paid'" class="side">
        <v-btn variant="outlined" color="error" size="small" class="btn" prepend-icon="mdi-cash-refund" :disabled="!p.refundable" @click="$emit('refund', p)">Reembolsar</v-btn>
        <p v-if="p.refundBlockedReason" class="text-caption text-medium-emphasis blocked">{{ REFUND_BLOCKED[p.refundBlockedReason] }}</p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.list { list-style: none; margin: 0; padding: 0; }
.row { display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; padding: 14px 0; border-top: 1px solid var(--line); }
.row:first-child { border-top: 0; }
.main { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.top { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 4px; }
.amount { font-size: 1.125rem; }
.side { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; max-width: 220px; text-align: right; }
.btn { min-height: 44px; }
@media (max-width: 600px) {
  .row { flex-direction: column; }
  .side { align-items: flex-start; text-align: left; max-width: none; }
}
</style>
