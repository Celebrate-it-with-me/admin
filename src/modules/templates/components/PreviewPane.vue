<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { previewPayload, useMock } from '../services/templatesApi'
import { explainError, originOf, toSections } from '../logic'
import type { EditorSection, EventTypeSlug, Locale, Theme } from '../types'

/**
 * Live preview: an iframe of the app's /preview/invitation page. The admin asks the API to resolve the draft
 * (POST /preview, 400 ms after the last change) and hands the result to the iframe by postMessage, to its exact origin.
 */
const props = defineProps<{ sections: EditorSection[]; theme: Theme; eventType: EventTypeSlug; visible: boolean }>()

const DEBOUNCE_MS = 400
const READY_TIMEOUT_MS = 10000
const DESKTOP_WIDTH = 1280

const appUrl = ((import.meta.env.VITE_APP_URL as string | undefined) ?? '').replace(/\/+$/, '')
// The simulated page lives in the admin itself; with the real app the page is /preview/invitation.
const frameSrc = useMock ? '/src/modules/templates/dev/mock-preview.html' : `${appUrl}/preview/invitation`
const appOrigin = useMock ? window.location.origin : originOf(appUrl)

const locale = ref<Locale>('es')
const device = ref<'mobile' | 'desktop'>('mobile')
const frame = ref<HTMLIFrameElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const frameKey = ref(0)

const ready = ref(false)
const loading = ref(true)
const error = ref('')
const frameFailed = ref(false)
// Not reactive on purpose: postMessage cannot clone a Vue proxy.
let lastPayload: unknown = null
const stageWidth = ref(0)
const stageHeight = ref(0)

let timer: ReturnType<typeof setTimeout> | undefined
let readyTimer: ReturnType<typeof setTimeout> | undefined
let request = 0

const misconfigured = computed(() => !appOrigin)

const deliver = () => {
  if (!ready.value || lastPayload == null || !appOrigin) return
  frame.value?.contentWindow?.postMessage({ type: 'qv-preview', payload: lastPayload }, appOrigin)
}

const refresh = async () => {
  if (misconfigured.value) return
  const mine = ++request
  loading.value = true
  error.value = ''
  try {
    lastPayload = await previewPayload({ sections: toSections(props.sections), theme: props.theme, locale: locale.value, eventType: props.eventType })
    if (mine !== request) return
    deliver()
  } catch (e) {
    if (mine !== request) return
    const x = explainError(e)
    error.value = x.status === 422 ? 'La vista previa necesita datos válidos: corrige los campos marcados en el editor.' : x.message
  } finally {
    if (mine === request) loading.value = false
  }
}

const schedule = () => {
  clearTimeout(timer)
  timer = setTimeout(refresh, DEBOUNCE_MS)
}

const armReadyTimeout = () => {
  clearTimeout(readyTimer)
  frameFailed.value = false
  readyTimer = setTimeout(() => { if (!ready.value) frameFailed.value = true }, READY_TIMEOUT_MS)
}

const onMessage = (event: MessageEvent) => {
  // Only the app's origin, and only from our own iframe.
  if (event.origin !== appOrigin || event.source !== frame.value?.contentWindow) return
  const data = event.data as { type?: string } | null
  if (data?.type !== 'qv-preview-ready') return
  ready.value = true
  frameFailed.value = false
  clearTimeout(readyTimer)
  if (lastPayload != null) deliver(); else refresh()
}

const retry = () => {
  if (frameFailed.value || !ready.value) {
    ready.value = false
    frameKey.value++
    armReadyTimeout()
  }
  refresh()
}

watch(() => [props.sections, props.theme, props.eventType, locale.value], schedule, { deep: true })
// Opening the tab again after the editor tab: sync the size once it is visible.
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
  if (stage.value && typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(measure)
    observer.observe(stage.value)
  }
  measure()
  refresh()
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearTimeout(timer)
  clearTimeout(readyTimer)
  observer?.disconnect()
})

// Mobile: a real 390 px viewport. Desktop: a 1280 px viewport scaled down to fit the panel.
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
</script>

<template>
  <section class="pane" aria-label="Vista previa de la invitación">
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

    <div ref="stage" class="stage" :class="{ desktop: device === 'desktop' }">
      <iframe
        v-if="!misconfigured"
        :key="frameKey"
        ref="frame"
        :src="frameSrc"
        :style="frameStyle"
        class="frame"
        :class="{ dim: loading && ready }"
        title="Vista previa de la invitación"
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
