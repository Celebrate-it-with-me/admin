<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { DashboardCharts } from '@/types'
import { niceScale, shortDate } from '@/composables/useChartScale'

const props = defineProps<{ weeks: DashboardCharts['upcomingWeeks'] }>()

const box = ref<HTMLElement | null>(null)
const width = ref(480)
const HEIGHT = 220
const M = { top: 22, right: 8, bottom: 28, left: 28 }
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!box.value) return
  width.value = box.value.clientWidth || 480
  observer = new ResizeObserver(e => { width.value = Math.floor(e[0].contentRect.width) || width.value })
  observer.observe(box.value)
})
onBeforeUnmount(() => observer?.disconnect())

const hover = ref<number | null>(null)
const totals = computed(() => props.weeks.map(w => w.published + w.draft))
const scale = computed(() => niceScale(Math.max(0, ...totals.value), 3))
const inner = computed(() => ({ w: width.value - M.left - M.right, h: HEIGHT - M.top - M.bottom }))
const slot = computed(() => inner.value.w / props.weeks.length)
const barW = computed(() => Math.min(24, slot.value - 12))
const y = (v: number) => M.top + inner.value.h - (v / scale.value.top) * inner.value.h
const cx = (i: number) => M.left + slot.value * i + slot.value / 2
const GAP = 2
const R = 4

/** A column with a rounded top and a square foot; `h` is its height in pixels. */
const column = (i: number, y0: number, h: number, round: boolean) => {
  const x0 = cx(i) - barW.value / 2, w = barW.value, r = round ? Math.min(R, h) : 0
  return `M${x0},${y0 + h} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + w - r} Q${x0 + w},${y0} ${x0 + w},${y0 + r} V${y0 + h} Z`
}
const segs = computed(() => props.weeks.map((w, i) => {
  const base = y(0), pubH = base - y(w.published), draftH = base - y(w.draft)
  return {
    i, w,
    pub: w.published ? { d: column(i, base - pubH, Math.max(0, pubH - (w.draft ? GAP : 0)) , !w.draft) } : null,
    draft: w.draft ? { d: column(i, base - pubH - draftH, Math.max(0, draftH), true) } : null,
    total: w.published + w.draft,
  }
}))
// On a narrow screen every other week keeps its date, so the labels never touch.
const showLabel = (i: number) => slot.value >= 52 || i % 2 === 0
const hasData = computed(() => totals.value.some(Boolean))
const tip = computed(() => hover.value === null ? null : { ...props.weeks[hover.value], left: cx(hover.value), flip: cx(hover.value) > width.value * 0.6, label: shortDate(props.weeks[hover.value].weekStart) })
</script>

<template>
  <v-card class="pa-5 h-100">
    <h3 class="text-h6 mb-1">Próximas 8 semanas</h3>
    <p class="text-body-2 text-medium-emphasis mb-4">Eventos por semana: la carga de soporte que viene.</p>

    <div ref="box" class="chart">
      <svg :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" role="img" aria-label="Eventos por semana en las próximas 8 semanas, publicados y en borrador">
        <g class="grid">
          <g v-for="t in scale.values" :key="t">
            <line :x1="M.left" :x2="M.left + inner.w" :y1="y(t)" :y2="y(t)" />
            <text :x="M.left - 6" :y="y(t) + 4" text-anchor="end">{{ t }}</text>
          </g>
        </g>
        <g v-for="s in segs" :key="s.i" tabindex="0" class="col" :aria-label="`Semana del ${shortDate(s.w.weekStart)}: ${s.w.published} publicados, ${s.w.draft} en borrador`"
           @pointerenter="hover = s.i" @pointerleave="hover = null" @focus="hover = s.i" @blur="hover = null">
          <rect :x="cx(s.i) - slot / 2" :y="M.top" :width="slot" :height="inner.h" fill="transparent" />
          <path v-if="s.pub" :d="s.pub.d" class="pub" />
          <path v-if="s.draft" :d="s.draft.d" class="draft" />
          <text v-if="s.total" class="cap" :x="cx(s.i)" :y="y(s.total) - 6" text-anchor="middle">{{ s.total }}</text>
          <text v-if="showLabel(s.i)" class="xlabel" :x="cx(s.i)" :y="HEIGHT - 8" text-anchor="middle">{{ shortDate(s.w.weekStart) }}</text>
        </g>
      </svg>
      <p v-if="!hasData" class="empty">No hay eventos programados en estas semanas.</p>

      <div v-if="tip" class="tip" :class="{ 'tip--flip': tip.flip }" :style="{ left: tip.left + 'px' }" role="status">
        <p class="tip__date">Semana del {{ tip.label }}</p>
        <p class="tip__row"><span class="sw sw--pub" /><strong>{{ tip.published }}</strong> publicados</p>
        <p class="tip__row"><span class="sw sw--draft" /><strong>{{ tip.draft }}</strong> en borrador</p>
      </div>
    </div>

    <ul class="legend">
      <li><span class="sw sw--pub" /> Publicados</li>
      <li><span class="sw sw--draft" /> En borrador</li>
    </ul>
  </v-card>
</template>

<style scoped>
.chart { position: relative; width: 100%; }
svg { display: block; }
.grid line { stroke: var(--line); stroke-width: 1; }
.grid text, .xlabel { font-size: 12px; fill: var(--ink-500); font-family: var(--font-body); }
.cap { font-size: 12px; font-weight: 700; fill: var(--ink-900); font-family: var(--font-body); }
.pub { fill: var(--rose-600); }
.draft { fill: #c9a24e; }
.col:hover .pub, .col:focus .pub { fill: var(--rose-700); }
.col:hover .draft, .col:focus .draft { fill: #b38f3f; }
.col { outline: none; }
.col:focus-visible rect { stroke: var(--rose-600); stroke-width: 2; rx: 6; }
.empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--ink-500); font-size: 0.875rem; pointer-events: none; }
.tip { position: absolute; top: 0; transform: translateX(12px); background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; box-shadow: 0 8px 24px -12px rgba(43,36,32,.3); pointer-events: none; white-space: nowrap; }
.tip--flip { transform: translateX(calc(-100% - 12px)); }
.tip p { margin: 0; }
.tip__date { font-size: 0.75rem; color: var(--ink-500); margin-bottom: 4px !important; }
.tip__row { display: flex; align-items: center; gap: 8px; font-size: 0.875rem; }
.sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; flex: none; }
.sw--pub { background: var(--rose-600); }
.sw--draft { background: #c9a24e; }
.legend { list-style: none; display: flex; gap: 16px; padding: 8px 0 0; margin: 0; font-size: 0.8125rem; color: var(--ink-500); }
.legend li { display: inline-flex; align-items: center; gap: 8px; }
</style>
