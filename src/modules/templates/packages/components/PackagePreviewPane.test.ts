import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi } from '@/test/mount'

const api = vi.hoisted(() => ({ previewPackage: vi.fn() }))
vi.mock('../packagesApi', () => ({ ...api, useMock: false }))
vi.stubEnv('VITE_APP_URL', 'https://app.example')

const { default: PackagePreviewPane } = await import('./PackagePreviewPane.vue')

const mountPane = async () => {
  const w = mountUi(PackagePreviewPane, { props: { packageId: 5, eventTypes: ['wedding'], presets: [] } })
  await flushPromises()
  const iframe = w.find('iframe').element as HTMLIFrameElement
  const posted = vi.spyOn(iframe.contentWindow!, 'postMessage').mockImplementation(() => undefined)
  return { w, iframe, posted }
}
const fromApp = (source: unknown, data: unknown, origin = 'https://app.example') =>
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: source as MessageEventSource }))

beforeEach(() => { api.previewPackage.mockReset(); api.previewPackage.mockResolvedValue({ sections: [] }) })
afterEach(() => { document.body.innerHTML = '' })

describe('PackagePreviewPane message contract', () => {
  it('targets the iframe at the exact origin of the app, with no referrer', async () => {
    const { w, iframe, posted } = await mountPane()
    expect(iframe.getAttribute('src')).toBe('https://app.example/preview/invitation')
    expect(iframe.getAttribute('referrerpolicy')).toBe('no-referrer')
    fromApp(iframe.contentWindow, { type: 'qv-preview-ready' })
    await flushPromises()
    expect(posted).toHaveBeenCalledWith({ type: 'qv-preview', payload: { sections: [] } }, 'https://app.example')
    w.unmount()
  })

  it('ignores messages from another origin, from another window and of another type', async () => {
    const { w, iframe, posted } = await mountPane()
    fromApp(iframe.contentWindow, { type: 'qv-preview-ready' }, 'https://evil.example')
    fromApp(window, { type: 'qv-preview-ready' })
    fromApp(iframe.contentWindow, { type: 'something-else' })
    fromApp(iframe.contentWindow, 'qv-preview-ready')
    fromApp(iframe.contentWindow, null)
    await flushPromises()
    expect(posted).not.toHaveBeenCalled()
    expect(w.emitted('viewed')).toBeUndefined()
    w.unmount()
  })

  it('reports a view only after the sample invitation was delivered, for the device and state asked', async () => {
    const { w, iframe } = await mountPane()
    expect(w.emitted('viewed')).toBeUndefined()
    fromApp(iframe.contentWindow, { type: 'qv-preview-ready' })
    await flushPromises()
    expect(w.emitted('viewed')).toEqual([['mobile', 'invitation']])
    await w.findAll('button').find(b => b.text().includes('Escritorio'))!.trigger('click')
    await flushPromises()
    expect(w.emitted('viewed')?.at(-1)).toEqual(['desktop', 'invitation'])
    w.unmount()
  })

  it('does not report a view when the preview request fails, and shows a Spanish message without a trace', async () => {
    api.previewPackage.mockRejectedValue({ response: { status: 500, data: { message: 'SQLSTATE[HY000] at /var/www/app/Foo.php:12', trace: ['x'] } } })
    const { w, iframe } = await mountPane()
    fromApp(iframe.contentWindow, { type: 'qv-preview-ready' })
    await flushPromises()
    expect(w.emitted('viewed')).toBeUndefined()
    expect(w.text()).toContain('No pudimos hacerlo')
    expect(w.text()).not.toContain('SQLSTATE')
    expect(w.text()).not.toContain('/var/www')
    w.unmount()
  })
})
