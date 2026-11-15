<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { originOf } from '../../logic'
import { previewPackage, useMock } from '../packagesApi'
import { explainPackageError, PREVIEW_STATES } from '../logic'
import type { PreviewState } from '../types'
import type { PreviewDevice } from '../logic'
import type { EventTypeSlug, Locale } from '../../types'

/**
 * Preview of a package with sample data: the same iframe of the app's /preview/invitation page the template editor uses.
 * The admin asks the API to resolve the sample invitation with the staged zip or the installed package (POST templates/preview)
 * and hands the result to the iframe by postMessage, to its exact origin.
 */
const props = defineProps<{
  stageToken?: string | null
  packageId?: number | null
  eventTypes: EventTypeSlug[]
  presets: { id: string; label: string }[]
  visible?: boolean
}>()
/** `viewed`: the sample invitation of this device and state was drawn in the iframe (the checklist opens after all of them). */
const emit = defineEmits<{ viewed: [device: PreviewDevice, state: PreviewState] }>()

const DEBOUNCE_MS = 250
const READY_TIMEOUT_MS = 10000
const DESKTOP_WIDTH = 1280

const appUrl = ((import.meta.env.VITE_APP_URL as string | undefined) ?? '').replace(/\/+$/, '')
const frameSrc = useMock ? '/src/modules/templates/dev/mock-preview.html' : `${appUrl}/preview/invitation`
const appOrigin = useMock ? window.location.origin : originOf(appUrl)

const locale = ref<Locale>('es')
const device = ref<'mobile' | 'desktop'>('mobile')
const eventType = ref<EventTypeSlug>(props.eventTypes[0] ?? 'quinceanera')
const state = ref<PreviewState>('invitation')
const preset = ref<string | null>(props.presets[0]?.id ?? null)

const frame = ref<HTMLIFrameElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const frameKey = ref(0)
const ready = ref(false)
const loading = ref(true)
const error = ref('')
const frameFailed = ref(false)
// Not reactive on purpose: postMessage cannot clone a Vue proxy.
let lastPayload: unknown = null
let lastPayloadState: PreviewState | null = null
const stageWidth = ref(0)
const stageHeight = ref(0)

let timer: ReturnType<typeof setTimeout> | undefined
let readyTimer: ReturnType<typeof setTimeout> | undefined
let request = 0

const misconfigured = computed(() => !appOrigin)

const deliver = () => {
  if (!ready.value || lastPayload == null || !appOrigin) return
  frame.value?.contentWindow?.postMessage({ type: 'qv-preview', payload: lastPayload }, appOrigin)
  announce()
}

// Counts as "viewed" only what was really delivered to the iframe: never a failed request or a frame that did not answer.
const announce = () => {
  if (ready.value && lastPayload != null && lastPayloadState && !error.value) emit('viewed', device.value, lastPayloadState)
}

const refresh = async () => {
  if (misconfigured.value || (!props.stageToken && !props.packageId)) return
  const mine = ++request
  loading.value = true
  error.value = ''
  const askedState = state.value
  try {
    const payload = await previewPackage({
      locale: locale.value,
      eventType: eventType.value,
      state: state.value,
      ...(preset.value ? { preset: preset.value } : {}),
      ...(props.stageToken ? { stage_token: props.stageToken } : { package_id: props.packageId as number }),
    })
    if (mine !== request) return
    lastPayload = payload
    lastPayloadState = askedState
    deliver()
  } catch (e) {
    if (mine !== request) return
    error.value = explainPackageError(e).message
  } finally {
    if (mine === request) loading.value = false
  }
}

const schedule = () => { clearTimeout(timer); timer = setTimeout(refresh, DEBOUNCE_MS) }

const armReadyTimeout = () => {
  clearTimeout(readyTimer)
  frameFailed.value = false
  readyTimer = setTimeout(() => { if (!ready.value) frameFailed.value = true }, READY_TIMEOUT_MS)
}

const onMessage = (event: MessageEvent) => {
  if (event.origin !== appOrigin || event.source !== frame.value?.contentWindow) return
  if ((event.data as { type?: string } | null)?.type !== 'qv-preview-ready') return
  ready.value = true
  frameFailed.value = false
  clearTimeout(readyTimer)
  if (lastPayload != null) deliver(); else refresh()
}

const retry = () => {
  if (frameFailed.value || !ready.value) { ready.value = false; frameKey.value++; armReadyTimeout() }
  refresh()
}

watch(device, announce)
watch([locale, eventType, state, preset, () => props.stageToken, () => props.packageId], schedule)
watch(() => props.visible, async v => { if (v) { await nextTick(); measure() } })

let observer: ResizeObserver | undefined
const measure = () => {
  if (!stage.value) return
  stageWidth.value = stage.value.clientWidth
  stageHeight.value = stage.value.clientHeight
}

onMounted(() => {
  window.addEventListener('message', onMessage)
  armReadyTimeout()
  if (stage.value && typeof ResizeObserver !== 'undefined') { observer = new ResizeObserver(measure); observer.observe(stage.value) }
  measure()
  refresh()
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearTimeout(timer)
  clearTimeout(readyTimer)
  observer?.disconnect()
})

const scale = computed(() => (device.value === 'desktop' && stageWidth.value > 0 ? Math.min(1, stageWidth.value / DESKTOP_WIDTH) : 1))
const frameStyle = computed(() => {
  if (device.value === 'mobile') return { width: '390px', maxWidth: '100%', height: '100%' }
  return { width: `${DESKTOP_WIDTH}px`, height: `${stageHeight.value / scale.value}px`, transform: `scale(${scale.value})`, transformOrigin: 'top left' }
})
const showError = computed(() => Boolean(error.value) || frameFailed.value || misconfigured.value)
const errorText = computed(() => {
  if (misconfigured.value) return 'Falta configurar VITE_APP_URL (la dirección de la app) para ver la vista previa.'
  if (error.value) return error.value
  return 'La app no respondió. Comprueba que esté en marcha y que permita mostrarse dentro del admin.'
})
const typeLabel = (t: EventTypeSlug) => (t === 'wedding' ? 'Boda' : 'Quinceañera')
</script>

<template>
  <section class="pane" aria-label="Vista previa del paquete">
    <div class="bar">
      <v-btn-toggle v-model="device" mandatory density="comfortable" variant="outlined" divided aria-label="Tamaño de la vista previa">
        <v-btn value="mobile" prepend-icon="mdi-cellphone" aria-label="Vista móvil, 390 píxeles">Móvil</v-btn>
        <v-btn value="desktop" prepend-icon="mdi-monitor" aria-label="Vista de escritorio">Escritorio</v-btn>
      </v-btn-toggle>
      <v-btn-toggle v-model="locale" mandatory density="comfortable" variant="outlined" divided aria-label="Idioma de la vista previa">
        <v-btn value="es" aria-label="Previsualizar en español">ES</v-btn>
        <v-btn value="en" aria-label="Previsualizar en inglés">EN</v-btn>
      </v-btn-toggle>
      <v-btn variant="text" size="small" prepend-icon="mdi-refresh" :loading="loading && !showError" @click="retry">Actualizar</v-btn>
    </div>
    <div class="selects">
      <v-select v-model="state" :items="PREVIEW_STATES" item-title="label" item-value="value" label="Estado" density="compact" variant="outlined" hide-details />
      <v-select
        v-if="eventTypes.length > 1" v-model="eventType" :items="eventTypes.map(t => ({ value: t, label: typeLabel(t) }))"
        item-title="label" item-value="value" label="Tipo de evento" density="compact" variant="outlined" hide-details
      />
      <v-select
        v-if="presets.length" v-model="preset" :items="presets" item-title="label" item-value="id"
        label="Paleta" density="compact" variant="outlined" hide-details
      />
    </div>

    <div ref="stage" class="stage" :class="{ desktop: device === 'desktop' }">
      <iframe
        v-if="!misconfigured"
        :key="frameKey"
        ref="frame"
        :src="frameSrc"
        :style="frameStyle"
        class="frame"
        :class="{ dim: loading && ready }"
        title="Vista previa del paquete"
        referrerpolicy="no-referrer"
      />
      <div v-if="loading && !ready && !showError" class="overlay" role="status">
        <v-progress-circular indeterminate size="22" width="2" /> Cargando la vista previa…
      </div>
      <div v-if="showError" class="overlay" role="alert">
        <p class="mb-3">{{ errorText }}</p>
        <v-btn variant="tonal" prepend-icon="mdi-refresh" @click="retry">Reintentar</v-btn>
      </div>
    </div>
    <p class="text-caption text-medium-emphasis mt-2 mb-0" aria-live="polite">
      Datos de muestra, no de invitados reales. <span v-if="loading && ready">Actualizando…</span>
    </p>
  </section>
</template>

<style scoped>
.pane { min-width: 0; }
.bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 10px; }
.selects { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; margin-bottom: 10px; }
.stage {
  position: relative; display: flex; justify-content: center; height: min(72vh, 760px); min-height: 420px; overflow: hidden;
  border: 1px solid var(--line); border-radius: 12px; background: var(--cream-200);
}
.stage.desktop { display: block; }
.frame { border: 0; background: #fff; display: block; }
.stage:not(.desktop) .frame { box-shadow: 0 0 0 1px var(--line); }
.dim { opacity: 0.7; transition: opacity 0.15s ease-out; }
.overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  padding: 24px; text-align: center; background: rgba(253, 251, 248, 0.88);
}
@media (max-width: 959px) { .stage { height: calc(100vh - 230px); min-height: 380px; } }
</style>
