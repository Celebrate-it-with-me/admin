import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref, type Ref } from 'vue'
import type { Audience } from './types'

const api = vi.hoisted(() => ({ previewAudience: vi.fn() }))
vi.mock('./services/announcementsApi', () => api)

import { useAudienceCount } from './composables'

const harness = (audience: Ref<Audience>, days: Ref<string>, enabled: Ref<boolean>) => {
  let result!: ReturnType<typeof useAudienceCount>
  const w = mount(defineComponent({ setup() { result = useAudienceCount(audience, days, enabled, 400); return () => h('div') } }))
  return { w, result }
}

beforeEach(() => { vi.useFakeTimers(); api.previewAudience.mockReset() })
afterEach(() => { vi.useRealTimers() })

describe('useAudienceCount', () => {
  it('counts after the debounce', async () => {
    api.previewAudience.mockResolvedValue(482)
    const { result } = harness(ref('all'), ref('30'), ref(true))
    expect(result.state.value).toBe('loading')
    expect(api.previewAudience).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(400)
    expect(api.previewAudience).toHaveBeenCalledWith({ audience: 'all' })
    expect(result.count.value).toBe(482)
    expect(result.state.value).toBe('ready')
  })

  it('asks once while she types the days', async () => {
    api.previewAudience.mockResolvedValue(10)
    const days = ref('3')
    harness(ref('upcoming_event'), days, ref(true))
    await vi.advanceTimersByTimeAsync(400); api.previewAudience.mockClear()
    for (const d of ['4', '45', '450', '45']) { days.value = d; await vi.advanceTimersByTimeAsync(100) }
    expect(api.previewAudience).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(400)
    expect(api.previewAudience).toHaveBeenCalledTimes(1)
    expect(api.previewAudience).toHaveBeenCalledWith({ audience: 'upcoming_event', upcoming_days: 45 })
  })

  it('does not ask while the days are invalid or the form is closed', async () => {
    const days = ref('')
    const enabled = ref(false)
    const { result } = harness(ref('upcoming_event'), days, enabled)
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.previewAudience).not.toHaveBeenCalled()
    expect(result.state.value).toBe('idle')
    enabled.value = true; await vi.advanceTimersByTimeAsync(1000)
    expect(api.previewAudience).not.toHaveBeenCalled()
  })

  it('drops an answer that arrives after a newer question', async () => {
    let first!: (n: number) => void
    api.previewAudience.mockImplementationOnce(() => new Promise<number>(r => { first = r })).mockResolvedValueOnce(91)
    const audience = ref<Audience>('all')
    const { result } = harness(audience, ref('30'), ref(true))
    await vi.advanceTimersByTimeAsync(400)
    audience.value = 'paid'
    await vi.advanceTimersByTimeAsync(400)
    expect(result.count.value).toBe(91)
    first(482); await flushPromises()
    expect(result.count.value).toBe(91)
  })

  it('reports an error and retries', async () => {
    api.previewAudience.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(5)
    const { result } = harness(ref('free'), ref('30'), ref(true))
    await vi.advanceTimersByTimeAsync(400)
    expect(result.state.value).toBe('error')
    await result.retry()
    expect(result.count.value).toBe(5)
  })
})
