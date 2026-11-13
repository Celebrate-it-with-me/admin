<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useCurrentUserStore } from "@/store/currentUser";
import { API } from "@/services/axios";
import { formatMoney } from "@/composables/useMoney";
import type { DashboardData } from "@/types";
import KpiCard from "@/components/dashboard/KpiCard.vue";
import FunnelCard from "@/components/dashboard/FunnelCard.vue";
import AttentionCard from "@/components/dashboard/AttentionCard.vue";
import ActivityChart from "@/components/dashboard/ActivityChart.vue";
import MixCard from "@/components/dashboard/MixCard.vue";
import UpcomingWeeks from "@/components/dashboard/UpcomingWeeks.vue";

const currentUser = useCurrentUserStore()

const days = ref(30)
const includeInternal = ref(false)
const data = ref<DashboardData | null>(null)
const loading = ref(true)
const failed = ref(false)
let latest = 0

const load = async () => {
  const request = ++latest
  loading.value = true
  failed.value = false
  try {
    const res = await API.get('dashboard', { params: { days: days.value, internal: includeInternal.value ? 1 : 0 } })
    if (request !== latest) return // a newer choice is already on its way
    data.value = res.data.data
  } catch {
    if (request === latest) failed.value = true
  } finally {
    if (request === latest) loading.value = false
  }
}

onMounted(load)
watch([days, includeInternal], load)

const updated = computed(() => data.value
  ? new Date(data.value.generatedAt).toLocaleTimeString('es-US', { hour: 'numeric', minute: '2-digit' })
  : '')

const kpis = computed(() => {
  const k = data.value?.kpis
  if (!k) return []
  return [
    { key: 'signups', label: 'Cuentas nuevas', metric: k.signups },
    { key: 'eventsCreated', label: 'Eventos creados', metric: k.eventsCreated },
    { key: 'published', label: 'Publicados', metric: k.published },
    { key: 'paid', label: 'Pagados', metric: k.paid },
    // The money numbers only come for roles that manage purchases (not for support).
    ...(k.revenueCents ? [{ key: 'revenueCents', label: 'Ingresos', metric: k.revenueCents, format: formatMoney }] : []),
    ...(k.refundedCents ? [{ key: 'refundedCents', label: 'Reembolsos', metric: k.refundedCents, format: formatMoney, inverse: true }] : []),
  ]
})

</script>

<template>
  <section>
    <header class="head">
      <div>
        <h2 class="greeting">Hola{{ currentUser.user.name ? `, ${currentUser.user.name}` : '' }}</h2>
        <p class="text-medium-emphasis">Así va Quinvite<span v-if="updated"> · actualizado a las {{ updated }}</span></p>
      </div>
      <div class="controls">
        <v-btn-toggle v-model="days" mandatory color="primary" variant="outlined" density="comfortable" divided aria-label="Periodo">
          <v-btn :value="7">7 días</v-btn>
          <v-btn :value="30">30 días</v-btn>
          <v-btn :value="90">90 días</v-btn>
        </v-btn-toggle>
        <v-switch v-model="includeInternal" color="primary" density="compact" hide-details label="Incluir cuentas internas" />
      </div>
    </header>

    <v-alert v-if="failed" type="error" variant="tonal" class="mb-6" text="No pudimos cargar las métricas.">
      <template #append><v-btn variant="text" @click="load">Reintentar</v-btn></template>
    </v-alert>

    <div :aria-busy="loading" :class="{ 'is-loading': loading && data }">
      <v-row v-if="!data && loading">
        <v-col v-for="n in 6" :key="n" cols="6" md="4" lg="2"><v-skeleton-loader type="card" /></v-col>
      </v-row>

      <template v-if="data">
        <v-row>
          <v-col v-for="k in kpis" :key="k.key" cols="6" md="4" lg="2">
            <kpi-card :label="k.label" :metric="k.metric" :format="k.format" :inverse="k.inverse" :days="data.days" />
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12"><activity-chart :series="data.series" :days="data.days" /></v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12" lg="7"><funnel-card :funnel="data.funnel" :days="data.days" /></v-col>
          <v-col cols="12" lg="5"><attention-card :items="data.attention" /></v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12" md="6"><upcoming-weeks :weeks="data.upcomingWeeks" /></v-col>
          <v-col cols="12" md="6"><mix-card :mix="data.mix" /></v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col cols="12">
            <v-card class="pa-5">
              <h3 class="text-h6 mb-4">Uso real</h3>
              <v-row>
                <v-col cols="6" md="3"><p class="stat__value">{{ data.usage.guests }}</p><p class="stat__label">invitados cargados</p></v-col>
                <v-col cols="6" md="3"><p class="stat__value">{{ data.usage.answerRate }}%</p><p class="stat__label">han respondido ({{ data.usage.answered }}, de ellos {{ data.usage.attending }} asisten)</p></v-col>
                <v-col cols="6" md="3"><p class="stat__value">{{ data.usage.liveEvents }}</p><p class="stat__label">eventos publicados ahora</p></v-col>
                <v-col cols="6" md="3"><p class="stat__value">{{ data.usage.upcoming }}</p><p class="stat__label">eventos en los próximos 30 días<span v-if="data.usage.upcomingDraft"> ({{ data.usage.upcomingDraft }} sin publicar)</span></p></v-col>
              </v-row>
            </v-card>
          </v-col>
        </v-row>
      </template>
    </div>

  </section>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
.greeting { font-size: 2rem; margin-bottom: 4px; }
.controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; }
.is-loading { opacity: 0.55; transition: opacity 0.15s ease-out; pointer-events: none; }
.stat__value { font-family: var(--font-heading); font-size: 2rem; line-height: 1.1; margin: 0; }
.stat__label { font-size: 0.875rem; line-height: 1.45; color: var(--ink-500); margin: 4px 0 0; }
</style>
