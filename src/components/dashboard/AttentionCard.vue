<script setup lang="ts">
import type { AttentionItem } from '@/types'

defineProps<{ items: AttentionItem[] }>()

const COPY: Record<AttentionItem['type'], { icon: string; title: (n: number) => string; hint: string; tone: string }> = {
  stuck_purchases: { icon: 'mdi-credit-card-off-outline', tone: 'error', title: n => `${n} ${n === 1 ? 'pago sin confirmar' : 'pagos sin confirmar'}`, hint: 'Llevan más de una hora pendientes o fallidos.' },
  over_free_limit: { icon: 'mdi-account-multiple-plus-outline', tone: 'warning', title: n => `${n} ${n === 1 ? 'evento pasó' : 'eventos pasaron'} el tope gratis`, hint: 'Tienen más de 30 invitados y siguen en el plan gratis.' },
  upcoming_draft: { icon: 'mdi-calendar-alert-outline', tone: 'warning', title: n => `${n} ${n === 1 ? 'evento próximo sigue' : 'eventos próximos siguen'} en borrador`, hint: 'Son en menos de 14 días y no se ha publicado la invitación.' },
  coupons_ending: { icon: 'mdi-ticket-percent-outline', tone: 'info', title: n => `${n} ${n === 1 ? 'código está' : 'códigos están'} por vencer o agotarse`, hint: 'Vencen en 7 días o ya van en el 80% de sus usos.' },
}

const example = (type: AttentionItem['type'], e: AttentionItem['examples'][number]) =>
  type === 'coupons_ending' ? `${e.label} (${e.used}/${e.max ?? '∞'} usos)` : (e.label ?? `Evento #${e.eventId}`)
</script>

<template>
  <v-card class="pa-5 h-100">
    <h3 class="text-h6 mb-4">Necesita atención</h3>

    <div v-if="!items.length" class="ok">
      <v-icon icon="mdi-check-circle-outline" color="success" size="28" class="mb-2" aria-hidden="true" />
      <p class="font-weight-medium">Todo en orden</p>
      <p class="text-body-2 text-medium-emphasis">No hay nada pendiente por revisar.</p>
    </div>

    <ul v-else class="list">
      <li v-for="item in items" :key="item.type" class="list__item">
        <v-avatar :color="item.type === 'stuck_purchases' ? 'error' : item.type === 'coupons_ending' ? 'info' : 'warning'" variant="tonal" size="40">
          <v-icon :icon="COPY[item.type].icon" aria-hidden="true" />
        </v-avatar>
        <div class="list__body">
          <p class="font-weight-bold">{{ COPY[item.type].title(item.count) }}</p>
          <p class="text-body-2 text-medium-emphasis">{{ COPY[item.type].hint }}</p>
          <p class="text-body-2 mt-1">
            <span v-for="(e, i) in item.examples" :key="i">{{ i ? ' · ' : '' }}{{ example(item.type, e) }}</span>
            <span v-if="item.count > item.examples.length" class="text-medium-emphasis"> · y {{ item.count - item.examples.length }} más</span>
          </p>
        </div>
      </li>
    </ul>
  </v-card>
</template>

<style scoped>
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 18px; }
.list__item { display: flex; gap: 14px; align-items: flex-start; }
.list__body { min-width: 0; }
.list__body p { margin: 0; line-height: 1.5; }
.list__body p + p { margin-top: 2px; }
.ok { text-align: center; padding: 24px 0; }
</style>
