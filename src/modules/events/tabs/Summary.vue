<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMoney } from '@/composables/useMoney'
import { activityLabel, attendingPercent, dateLabel, moduleLabel, purchaseTone, roleLabel, STATUS, typeName } from '../labels'
import type { EventDetail } from '../types'

const props = defineProps<{ detail: EventDetail }>()
defineEmits<{ reload: [] }>()

const d = computed(() => props.detail)
const percent = computed(() => attendingPercent(d.value.counts.attending, d.value.counts.guests))
const last = computed(() => d.value.payment.lastPurchase)
const lastTone = computed(() => purchaseTone(last.value?.status ?? null))
const active = computed(() => d.value.modules.filter(m => m.state === 'active'))
const locked = computed(() => d.value.modules.filter(m => m.state === 'locked'))
const money = (n: number, currency: string) => formatMoney(Math.round(n * 100), currency)

const copied = ref(false)
const copy = async () => {
  const url = d.value.publicLink.url
  if (!url) return
  try { await navigator.clipboard.writeText(url); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { /* the link stays visible to copy by hand */ }
}
</script>

<template>
  <v-row>
    <v-col cols="12" md="6">
      <v-card class="pa-5 h-100">
        <h3 class="text-h6 mb-3">Dueña y colaboradoras</h3>
        <ul class="people">
          <li v-if="d.owner">
            <router-link :to="`/dashboard/users/${d.owner.id}`" class="person"><strong>{{ d.owner.name }}</strong><span class="text-caption text-medium-emphasis">{{ d.owner.email }}</span></router-link>
            <v-chip size="small" variant="tonal" color="primary">Dueña</v-chip>
          </li>
          <li v-for="c in d.collaborators" :key="c.id">
            <router-link :to="`/dashboard/users/${c.id}`" class="person"><strong>{{ c.name }}</strong><span class="text-caption text-medium-emphasis">{{ c.email }}</span></router-link>
            <v-chip size="small" variant="tonal">{{ roleLabel(c.role) }}</v-chip>
          </li>
        </ul>
        <p v-if="!d.owner && !d.collaborators.length" class="text-medium-emphasis">Este evento no tiene dueña asignada.</p>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card class="pa-5 h-100">
        <h3 class="text-h6 mb-3">Plan y pago</h3>
        <template v-if="d.plan">
          <p><strong>{{ d.plan.name }}</strong> · hasta {{ d.plan.guestLimit ?? 'sin límite de' }} invitados<span v-if="d.plan.priceCents != null"> · {{ formatMoney(d.plan.priceCents) }}</span></p>
        </template>
        <p v-else class="text-medium-emphasis">Sin plan asignado.</p>
        <div class="mt-3">
          <p class="label">Última compra</p>
          <template v-if="last">
            <v-chip v-if="lastTone" :color="lastTone.color" variant="tonal" size="small" :prepend-icon="lastTone.icon">{{ lastTone.label }}</v-chip>
            <p class="text-body-2 mt-1">
              <template v-if="last.amountCents != null">{{ formatMoney(last.amountCents, last.currency ?? 'USD') }} · </template>
              {{ dateLabel(last.paidAt ?? last.createdAt) }}<template v-if="last.isFounder"> · código de fundador</template>
            </p>
          </template>
          <p v-else class="text-medium-emphasis">Sin compras.</p>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card class="pa-5 h-100">
        <h3 class="text-h6 mb-3">Enlace público</h3>
        <template v-if="d.publicLink.url">
          <p class="mb-2"><v-chip size="small" variant="tonal" :color="d.publicLink.isLive ? 'success' : 'warning'">{{ d.publicLink.isLive ? 'En línea' : `Aún no visible (${STATUS[d.event.status].label.toLowerCase()})` }}</v-chip></p>
          <div class="link-row">
            <code class="link">{{ d.publicLink.url }}</code>
            <v-btn variant="tonal" size="small" class="copy" :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'" @click="copy">{{ copied ? 'Copiado' : 'Copiar' }}</v-btn>
          </div>
          <p class="text-caption text-medium-emphasis mt-2">Cada invitado principal abre <code>{{ d.publicLink.pattern }}</code> con su código.</p>
          <p v-if="d.event.slugLocked" class="text-caption text-medium-emphasis">El enlace está bloqueado: ya se enviaron invitaciones.</p>
        </template>
        <p v-else class="text-medium-emphasis">Este evento todavía no tiene enlace.</p>
        <p class="text-aria-live" aria-live="polite" style="position:absolute;left:-9999px">{{ copied ? 'Enlace copiado' : '' }}</p>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card class="pa-5 h-100">
        <h3 class="text-h6 mb-3">Invitados</h3>
        <p class="big">{{ d.counts.guests }} <span class="text-body-2 text-medium-emphasis">en total</span></p>
        <v-progress-linear :model-value="percent" color="success" bg-color="surface-variant" height="10" rounded class="my-3" :aria-label="`${percent}% confirmados`" />
        <ul class="counts">
          <li><strong>{{ d.counts.attending }}</strong> confirmados ({{ percent }}%)</li>
          <li><strong>{{ d.counts.notAttending }}</strong> no asisten</li>
          <li><strong>{{ d.counts.pending }}</strong> sin responder</li>
        </ul>
        <div v-if="d.counts.expenses" class="mt-4">
          <p class="label">Gastos</p>
          <p class="text-body-2">{{ d.counts.expenses.items }} {{ d.counts.expenses.items === 1 ? 'partida' : 'partidas' }} · {{ money(d.counts.expenses.total, d.counts.expenses.currency) }} comprometidos · {{ money(d.counts.expenses.paid, d.counts.expenses.currency) }} pagados<template v-if="d.counts.expenses.cap != null"> · tope {{ money(d.counts.expenses.cap, d.counts.expenses.currency) }}</template></p>
        </div>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card class="pa-5 h-100">
        <h3 class="text-h6 mb-3">Módulos</h3>
        <p class="label">Activos ({{ active.length }})</p>
        <p class="mod-list"><v-chip v-for="m in active" :key="m.key" size="small" color="success" variant="tonal" prepend-icon="mdi-check">{{ moduleLabel(m.key) }}</v-chip><span v-if="!active.length" class="text-medium-emphasis">Ninguno</span></p>
        <p class="label mt-3">Bloqueados por el plan ({{ locked.length }})</p>
        <p class="mod-list"><v-chip v-for="m in locked" :key="m.key" size="small" variant="tonal" prepend-icon="mdi-lock-outline">{{ moduleLabel(m.key) }}</v-chip><span v-if="!locked.length" class="text-medium-emphasis">Ninguno</span></p>
      </v-card>
    </v-col>

    <v-col cols="12" md="6">
      <v-card class="pa-5 h-100">
        <h3 class="text-h6 mb-3">Actividad reciente</h3>
        <ul v-if="d.recentActivity.length" class="activity">
          <li v-for="a in d.recentActivity" :key="a.id">
            <p>{{ activityLabel(a.type) }}</p>
            <p class="text-caption text-medium-emphasis">{{ a.actorName ?? 'Sistema' }} · {{ dateLabel(a.createdAt, true) }}</p>
          </li>
        </ul>
        <p v-else class="text-medium-emphasis">Todavía no hay actividad registrada.</p>
      </v-card>
    </v-col>

    <v-col cols="12">
      <v-card class="pa-5">
        <h3 class="text-h6 mb-3">Datos del evento</h3>
        <dl class="kv">
          <dt>Tipo</dt><dd>{{ typeName(d.event.type) }}</dd>
          <dt>Fecha</dt><dd>{{ dateLabel(d.event.startDate, true) }}</dd>
          <dt>Publicado</dt><dd>{{ d.event.publishedAt ? dateLabel(d.event.publishedAt, true) : 'No' }}</dd>
          <dt>Idioma y zona</dt><dd>{{ d.event.locale ?? '—' }} · {{ d.event.timezone ?? '—' }}</dd>
          <dt>Creado</dt><dd>{{ dateLabel(d.event.createdAt, true) }}</dd>
        </dl>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.people { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.people li { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.person { display: flex; flex-direction: column; min-width: 0; min-height: 44px; justify-content: center; color: var(--ink-900); text-decoration: none; overflow-wrap: anywhere; }
.person:hover strong, .person:focus-visible strong { color: var(--rose-700); text-decoration: underline; }
.label { font-size: 0.75rem; font-weight: 700; color: var(--ink-500); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
.link-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.link { background: var(--cream-200); padding: 8px 10px; border-radius: 8px; overflow-wrap: anywhere; flex: 1 1 200px; }
.copy { min-height: 44px; }
.big { font-size: 2rem; font-family: var(--font-heading); }
.counts { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.mod-list { display: flex; flex-wrap: wrap; gap: 6px; }
.activity { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
.activity p { margin: 0; }
.kv { display: grid; grid-template-columns: max-content 1fr; gap: 6px 20px; margin: 0; }
.kv dt { color: var(--ink-500); }
.kv dd { margin: 0; font-weight: 600; }
</style>
