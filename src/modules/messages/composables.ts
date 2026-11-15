import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { serverFieldErrors } from './logic'
import { previewMessage } from './services/messagesApi'
import type { FieldErrors, Locale, MessagePreview } from './types'

export type PreviewState = 'idle' | 'loading' | 'ready' | 'invalid' | 'error'

/**
 * Live preview of a message (POST preview, nothing is saved). Typing does not call the API on every key: it waits `delay`
 * ms, and an answer that arrives after a newer question is dropped. On a 422 the last good preview stays on screen and
 * `errors` carries the codes by field. `enabled` pauses it.
 */
export function useLivePreview(key: Ref<string>, locale: Ref<Locale>, fields: Ref<Record<string, string>>, enabled: Ref<boolean>, delay = 400) {
  const preview = ref<MessagePreview | null>(null)
  const state = ref<PreviewState>('idle')
  const errors = ref<FieldErrors>({})
  let timer: ReturnType<typeof setTimeout> | undefined
  let latest = 0

  const run = async () => {
    const request = ++latest
    if (!enabled.value) { state.value = 'idle'; return }
    state.value = 'loading'
    try {
      const result = await previewMessage(key.value, locale.value, fields.value)
      if (request !== latest) return
      preview.value = result
      errors.value = {}
      state.value = 'ready'
    } catch (e) {
      if (request !== latest) return
      const found = serverFieldErrors(e)
      if ((e as { response?: { status?: number } })?.response?.status === 422 && Object.keys(found).length) { errors.value = found; state.value = 'invalid' }
      else { errors.value = {}; state.value = 'error' }
    }
  }

  const schedule = () => {
    clearTimeout(timer)
    latest++
    if (!enabled.value) { state.value = 'idle'; return }
    state.value = 'loading'
    timer = setTimeout(run, delay)
  }

  watch([key, locale, () => JSON.stringify(fields.value), enabled], schedule, { immediate: true })
  onBeforeUnmount(() => { clearTimeout(timer); latest++ })
  return { preview, state, errors, retry: run }
}
