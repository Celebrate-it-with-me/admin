import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { audienceQuery } from './logic'
import { previewAudience } from './services/announcementsApi'
import type { Audience } from './types'

export type CountState = 'idle' | 'loading' | 'ready' | 'error'

/**
 * Live count of the organizers an audience reaches (POST audience-preview). Typing the days does not call the API on every
 * key: it waits `delay` ms, and an answer that arrives after a newer question is dropped. `enabled` pauses it (closed form).
 */
export function useAudienceCount(audience: Ref<Audience>, upcomingDays: Ref<string>, enabled: Ref<boolean>, delay = 400) {
  const count = ref<number | null>(null)
  const state = ref<CountState>('idle')
  let timer: ReturnType<typeof setTimeout> | undefined
  let latest = 0

  const run = async () => {
    const query = audienceQuery(audience.value, upcomingDays.value)
    const request = ++latest
    if (!enabled.value || !query) { count.value = null; state.value = 'idle'; return }
    state.value = 'loading'
    try {
      const n = await previewAudience(query)
      if (request !== latest) return
      count.value = n
      state.value = 'ready'
    } catch {
      if (request !== latest) return
      count.value = null
      state.value = 'error'
    }
  }

  const schedule = () => {
    clearTimeout(timer)
    latest++
    if (!enabled.value || !audienceQuery(audience.value, upcomingDays.value)) { count.value = null; state.value = 'idle'; return }
    state.value = 'loading'
    timer = setTimeout(run, delay)
  }

  watch([audience, upcomingDays, enabled], schedule, { immediate: true })
  onBeforeUnmount(() => { clearTimeout(timer); latest++ })
  return { count, state, retry: run }
}
