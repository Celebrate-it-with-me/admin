<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { DashboardCharts, SeriesKey } from '@/types'
import { niceScale, shortDate, compact } from '@/composables/useChartScale'
import { formatMoney } from '@/composables/useMoney'

const props = defineProps<{ series: DashboardCharts['series']; days: number }>()

const METRICS: { key: SeriesKey; label: string }[] = [
  { key: 'signups', label: 'Cuentas nuevas' },
  { key: 'eventsCreated', label: 'Eventos creados' },
  { key: 'published', label: 'Publicados' },
  { key: 'paid', label: 'Pagados' },
  { key: 'revenueCents', label: 'Ingresos' },
]

const metric = ref<SeriesKey>('signups')
const view = ref<'chart' | 'table'>('chart')
const hover = ref<number | null>(null)

const box = ref<HTMLElement | null>(null)
const width = ref(640)
const HEIGHT = 260
const M = { top: 16, right: 56, bottom: 28, left: 44 }
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!box.value) return
  width.value = box.value.clientWidth || 640
  observer = new ResizeObserver(entries => { width.value = Math.floor(entries[0].contentRect.width) || width.value })
  observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())

const money = computed(() => metric.value === 'revenueCents')
const fmt = (n: number) => (money.value ? formatMoney(n) : new Intl.NumberFormat('es-US').format(n))
const axisFmt = (n: number) => (money.value ? '$' + compact(n / 100) : compact(n))

const data = computed(() => props.series.metrics[metric.value])
const dates = computed(() => props.series.dates)
const scale = computed(() => niceScale(Math.max(0, ...data.value.current, ...data.value.previous)))
const inner = computed(() => ({ w: Math.max(80, width.value - M.left - M.right), h: HEIGHT - M.top - M.bottom }))

const x = (i: number) => M.left + (dates.value.length <= 1 ? 0 : (i / (dates.value.length - 1)) * inner.value.w)
const y = (v: number) => M.top + inner.value.h - (v / scale.value.top) * inner.value.h
const line = (values: number[]) => values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
const area = computed(() => `${line(data.value.current)} L${x(dates.value.length - 1)},${y(0)} L${x(0)},${y(0)} Z`)

const xTicks = computed(() => {
  const n = dates.value.length
  const count = width.value < 480 ? 3 : 5
  return Array.from({ length: count }, (_, k) => Math.round((k / (count - 1)) * (n - 1)))
})

const total = computed(() => data.value.current.reduce((a, b) => a + b, 0))
const prevTotal = computed(() => data.value.previous.reduce((a, b) => a + b, 0))
const last = computed(() => data.value.current.length - 1)

function move(e: PointerEvent) {
  const svg = (e.currentTarget as SVGElement).getBoundingClientRect()
  const ratio = (e.clientX - svg.left - M.left) / inner.value.w
  hover.value = Math.min(dates.value.length - 1, Math.max(0, Math.round(ratio * (dates.value.length - 1))))
}
function key(e: KeyboardEvent) {
  const n = dates.value.length
  if (e.key === 'ArrowRight') hover.value = Math.min(n - 1, (hover.value ?? -1) + 1)
  else if (e.key === 'ArrowLeft') hover.value = Math.max(0, (hover.value ?? n) - 1)
  else if (e.key === 'Escape') hover.value = null
  else return
  e.preventDefault()
}

const tip = computed(() => {
  if (hover.value === null) return null
  const i = hover.value
  const left = x(i)
  return { i, left, flip: left > width.value * 0.6, cur: data.value.current[i], prev: data.value.previous[i], date: shortDate(dates.value[i]), prevDate: shortDate(prevDate(i)) }
})
function prevDate(i: number) {
  const [yy, mm, dd] = dates.value[i].split('-').map(Number)
  const d = new Date(yy, mm - 1, dd - props.days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const label = computed(() => METRICS.find(m => m.key === metric.value)!.label)
</script>

<template>
  <v-card class="pa-5">
    <div class="head">
      <div>
        <h3 class="text-h6">Actividad por día</h3>
        <p class="text-body-2 text-medium-emphasis">{{ label }}: {{ fmt(total) }} en {{ days }} días ({{ fmt(prevTotal) }} en los {{ days }} anteriores)</p>
      </div>
      <v-btn variant="text" size="small" :prepend-icon="view === 'chart' ? 'mdi-table' : 'mdi-chart-line'" @click="view = view === 'chart' ? 'table' : 'chart'">
        {{ view === 'chart' ? 'Ver tabla' : 'Ver gráfica' }}
      </v-btn>
    </div>

    <v-chip-group v-model="metric" mandatory column selected-class="chip--on" class="mb-2" aria-label="Métrica">
      <v-chip v-for="m in METRICS" :key="m.key" :value="m.key" variant="outlined" filter>{{ m.label }}</v-chip>
    </v-chip-group>

    <div v-show="view === 'chart'" ref="box" class="chart">
      <svg
        :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" role="img" tabindex="0"
        :aria-label="`${label} por día. ${fmt(total)} en el periodo. Usa las flechas para recorrer los días.`"
        @pointermove="move" @pointerleave="hover = null" @keydown="key" @blur="hover = null"
      >
        <g class="grid">
          <g v-for="t in scale.values" :key="t">
            <line :x1="M.left" :x2="M.left + inner.w" :y1="y(t)" :y2="y(t)" />
            <text :x="M.left - 8" :y="y(t) + 4" text-anchor="end">{{ axisFmt(t) }}</text>
          </g>
        </g>
        <text v-for="i in xTicks" :key="i" class="xlabel" :x="x(i)" :y="HEIGHT - 8" :text-anchor="i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'">{{ shortDate(dates[i]) }}</text>

        <path class="prev" :d="line(data.previous)" />
        <path class="area" :d="area" />
        <path class="cur" :d="line(data.current)" />

        <!-- End of the line: the latest value, labelled directly. -->
        <circle class="dot" :cx="x(last)" :cy="y(data.current[last])" r="4" />
        <text class="endlabel" :x="x(last) + 10" :y="y(data.current[last]) + 4">{{ money ? axisFmt(data.current[last]) : data.current[last] }}</text>

        <g v-if="tip">
          <line class="cross" :x1="tip.left" :x2="tip.left" :y1="M.top" :y2="M.top + inner.h" />
          <circle class="dot" :cx="tip.left" :cy="y(tip.cur)" r="4" />
          <circle class="dot dot--prev" :cx="tip.left" :cy="y(tip.prev)" r="4" />
        </g>
      </svg>

      <div v-if="tip" class="tip" :class="{ 'tip--flip': tip.flip }" :style="{ left: tip.left + 'px' }" role="status">
        <p class="tip__date">{{ tip.date }}</p>
        <p class="tip__row"><span class="key key--cur" /><strong>{{ fmt(tip.cur) }}</strong></p>
        <p class="tip__row tip__row--prev"><span class="key key--prev" /><strong>{{ fmt(tip.prev) }}</strong> <span>{{ tip.prevDate }}</span></p>
      </div>
    </div>

    <ul v-show="view === 'chart'" class="legend">
      <li><span class="key key--cur" /> Últimos {{ days }} días</li>
      <li><span class="key key--prev" /> {{ days }} días anteriores</li>
    </ul>

    <v-table v-if="view === 'table'" density="compact" class="table" height="260" fixed-header>
      <thead><tr><th>Día</th><th class="text-right">{{ label }}</th><th class="text-right">Mismo día, periodo anterior</th></tr></thead>
      <tbody>
        <tr v-for="(d, i) in dates" :key="d"><td>{{ shortDate(d) }}</td><td class="text-right">{{ fmt(data.current[i]) }}</td><td class="text-right">{{ fmt(data.previous[i]) }}</td></tr>
      </tbody>
    </v-table>
  </v-card>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 12px; }
.chart { position: relative; width: 100%; }
svg { display: block; outline-offset: 2px; touch-action: pan-y; }
svg:focus-visible { outline: 2px solid var(--rose-600); border-radius: 8px; }
.grid line { stroke: var(--line); stroke-width: 1; }
.grid text, .xlabel { font-size: 12px; fill: var(--ink-500); font-family: var(--font-body); }
.cur { fill: none; stroke: var(--rose-600); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.area { fill: var(--rose-600); opacity: 0.1; stroke: none; }
.prev { fill: none; stroke: #b8aca5; stroke-width: 1.5; stroke-linejoin: round; }
.dot { fill: var(--rose-600); stroke: #fff; stroke-width: 2; }
.dot--prev { fill: #b8aca5; }
.cross { stroke: var(--ink-300, #c2b8b1); stroke-width: 1; }
.endlabel { font-size: 12px; font-weight: 700; fill: var(--ink-900); font-family: var(--font-body); }
.tip { position: absolute; top: 8px; transform: translateX(12px); background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; box-shadow: 0 8px 24px -12px rgba(43,36,32,.3); pointer-events: none; min-width: 130px; }
.tip--flip { transform: translateX(calc(-100% - 12px)); }
.tip p { margin: 0; }
.tip__date { font-size: 0.75rem; color: var(--ink-500); margin-bottom: 4px !important; }
.tip__row { display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.tip__row--prev { font-size: 0.8125rem; color: var(--ink-500); margin-top: 2px !important; }
.tip__row--prev span:last-child { font-size: 0.75rem; }
.key { display: inline-block; width: 16px; height: 0; border-top: 2px solid; flex: none; }
.key--cur { border-color: var(--rose-600); }
.key--prev { border-color: #b8aca5; }
.legend { list-style: none; display: flex; flex-wrap: wrap; gap: 16px; padding: 8px 0 0; margin: 0; font-size: 0.8125rem; color: var(--ink-500); }
.legend li { display: inline-flex; align-items: center; gap: 8px; }
.table { margin-top: 8px; }
:deep(.chip--on) { background: var(--rose-50); border-color: var(--rose-600); color: var(--rose-700); }
</style>
