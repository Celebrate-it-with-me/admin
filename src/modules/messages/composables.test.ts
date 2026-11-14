import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useLivePreview } from './composables'
import type { Locale, MessagePreview } from './types'

const api = vi.hoisted(() => ({ previewMessage: vi.fn() }))
vi.mock('./services/messagesApi', () => api)

const pv = (subject: string): MessagePreview => ({ subject, preheader: '', html: `<p>${subject}</p>` })
const setup = () => {
  const fields = ref<Record<string, string>>({})
  const locale = ref<Locale>('es')
  return { fields, locale, ...useLivePreview(ref('confirm'), locale, fields, ref(true), 400) }
}

beforeEach(() => { vi.useFakeTimers(); api.previewMessage.mockReset() })
afterEach(() => { vi.useRealTimers() })

describe('useLivePreview', () => {
  it('waits for the typing to pause before it asks', async () => {
    api.previewMessage.mockResolvedValue(pv('ok'))
    const { fields, state, preview } = setup()
    await nextTick()
    expect(state.value).toBe('loading')
    await vi.advanceTimersByTimeAsync(399)
    expect(api.previewMessage).not.toHaveBeenCalled()
    fields.value = { title: 'a' }
    await nextTick()
    await vi.advanceTimersByTimeAsync(300)
    fields.value = { title: 'ab' }
    await nextTick()
    await vi.advanceTimersByTimeAsync(399)
    expect(api.previewMessage).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2)
    expect(api.previewMessage).toHaveBeenCalledTimes(1)
    expect(api.previewMessage).toHaveBeenCalledWith('confirm', 'es', { title: 'ab' })
    expect(state.value).toBe('ready')
    expect(preview.value?.subject).toBe('ok')
  })

  it('drops an answer that arrives after a newer question', async () => {
    let first: (v: MessagePreview) => void = () => {}
    api.previewMessage.mockReturnValueOnce(new Promise<MessagePreview>(r => { first = r })).mockResolvedValueOnce(pv('nuevo'))
    const { fields, preview } = setup()
    await vi.advanceTimersByTimeAsync(400)
    fields.value = { title: 'x' }
    await nextTick()
    await vi.advanceTimersByTimeAsync(400)
    first(pv('viejo'))
    await vi.advanceTimersByTimeAsync(0)
    expect(preview.value?.subject).toBe('nuevo')
  })

  it('keeps the last good preview and reports the codes on a 422', async () => {
    api.previewMessage.mockResolvedValueOnce(pv('bueno')).mockRejectedValueOnce({ response: { status: 422, data: { errors: { 'fields.subject': ['missing_variable'] } } } })
    const { fields, state, errors, preview } = setup()
    await vi.advanceTimersByTimeAsync(400)
    fields.value = { subject: 'sin variable' }
    await nextTick()
    await vi.advanceTimersByTimeAsync(400)
    expect(state.value).toBe('invalid')
    expect(errors.value).toEqual({ subject: 'missing_variable' })
    expect(preview.value?.subject).toBe('bueno')
  })

  it('goes to error on other failures, and retry asks again', async () => {
    api.previewMessage.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValueOnce(pv('de nuevo'))
    const { state, retry } = setup()
    await vi.advanceTimersByTimeAsync(400)
    expect(state.value).toBe('error')
    await retry()
    expect(state.value).toBe('ready')
  })
})
