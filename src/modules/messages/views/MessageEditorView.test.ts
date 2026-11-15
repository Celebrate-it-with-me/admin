import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountUi } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import type { FieldDetail, Locale, MessageDetail } from '../types'
import MessageEditorView from './MessageEditorView.vue'

const api = vi.hoisted(() => ({ getMessage: vi.fn(), saveMessage: vi.fn(), restoreMessage: vi.fn(), previewMessage: vi.fn(), sendTest: vi.fn(), listMessages: vi.fn() }))
vi.mock('../services/messagesApi', () => api)
vi.mock('vue-router', async importOriginal => ({
  ...(await importOriginal<typeof import('vue-router')>()), useRoute: () => ({ params: { key: 'invoice' } }), onBeforeRouteLeave: () => {},
}))

const f = (current: string, over: Partial<FieldDetail> = {}): FieldDetail => ({ default: current, current, overridden: false, variables: [], maxLength: 150, ...over })
const detail = (locale: Locale, over: Record<string, FieldDetail> = {}): MessageDetail => ({
  key: 'invoice', name: 'Factura', locale,
  fields: {
    subject: f(locale === 'es' ? 'Tu factura :number' : 'Your invoice :number', { variables: ['number'] }),
    title: f(locale === 'es' ? 'Gracias por tu compra' : 'Thank you'),
    ...over,
  },
  variables: [{ name: 'number', example: 'F-1' }], updatedAt: null, updatedBy: null,
})
const preview = { subject: 'Tu factura F-1', preheader: 'Pre', html: '<p>hola</p>' }

const mountView = async (permissions = ['admin.events.view', 'admin.messages.manage']) => {
  setActivePinia(createPinia())
  useCurrentUserStore().user = { email: 'yo@cwm.test', permissions } as never
  const w = mountUi(MessageEditorView)
  await flushPromises()
  return w
}
const input = (name: string) => document.body.querySelector<HTMLInputElement>(`#msg-field-${name}`)!
const type = async (name: string, value: string) => { const el = input(name); el.value = value; el.dispatchEvent(new Event('input')); await flushPromises() }
const btn = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === label)!
const reason = async (text: string) => {
  const ta = document.body.querySelector<HTMLTextAreaElement>('.v-dialog textarea[maxlength="500"]')!
  ta.value = text
  ta.dispatchEvent(new Event('input'))
  await flushPromises()
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset())
  api.getMessage.mockImplementation(async (_k: string, l: Locale) => detail(l))
  api.previewMessage.mockResolvedValue(preview)
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = '' })

describe('MessageEditorView', () => {
  it('loads both languages, shows a field per text with the variables chips and the sandboxed preview', async () => {
    const w = await mountView()
    expect(api.getMessage).toHaveBeenCalledWith('invoice', 'es')
    expect(api.getMessage).toHaveBeenCalledWith('invoice', 'en')
    expect(input('subject').value).toBe('Tu factura :number')
    expect(document.body.querySelector('[data-var="number"]')).not.toBeNull()
    await vi.advanceTimersByTimeAsync(450)
    await flushPromises()
    const frame = document.body.querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('')
    expect(frame.getAttribute('srcdoc')).toBe('<p>hola</p>')
    expect(document.body.innerHTML).not.toContain('v-html')
    w.unmount()
  })

  it('flags a lost variable, refuses to save and previews only what changed', async () => {
    const w = await mountView()
    await type('subject', 'Tu factura')
    expect(document.body.querySelector('[data-var="number"][data-missing]')).not.toBeNull()
    expect(document.body.textContent).toContain('Falta conservar :number')
    expect(btn('Guardar cambios').disabled).toBe(true)
    await vi.advanceTimersByTimeAsync(450)
    expect(api.previewMessage).toHaveBeenLastCalledWith('invoice', 'es', { subject: 'Tu factura' })
    w.unmount()
  })

  it('saves only the changed fields with the reason', async () => {
    api.saveMessage.mockResolvedValue(detail('es', { title: f('Gracias, de verdad', { default: 'Gracias por tu compra', overridden: true }) }))
    const w = await mountView()
    await type('title', 'Gracias, de verdad')
    expect(document.body.textContent).toContain('Sin guardar')
    await btn('Guardar cambios').click()
    await flushPromises()
    await reason('Texto más cálido')
    await btn('Guardar').click()
    await flushPromises()
    expect(api.saveMessage).toHaveBeenCalledWith('invoice', 'es', { title: 'Gracias, de verdad' }, 'Texto más cálido')
    expect(document.body.textContent).toContain('Guardamos los textos en Español')
    expect(document.body.querySelector('[data-edited]')).not.toBeNull()
    w.unmount()
  })

  it('shows the 422 under the field the API names', async () => {
    api.saveMessage.mockRejectedValue({ response: { status: 422, data: { errors: { 'fields.title': ['links_not_allowed'] } } } })
    const w = await mountView()
    await type('title', 'Mira ya')
    await btn('Guardar cambios').click()
    await flushPromises()
    await reason('Probar un enlace')
    await btn('Guardar').click()
    await flushPromises()
    expect(document.body.querySelector('[data-field="title"]')!.textContent).toContain('No escribas enlaces')
    w.unmount()
  })

  it('restores one field asking for a reason, keeping the other edits', async () => {
    api.getMessage.mockImplementation(async (_k: string, l: Locale) => detail(l, { title: f('Gracias, de verdad', { default: 'Gracias por tu compra', overridden: true }) }))
    api.restoreMessage.mockResolvedValue(detail('es'))
    const w = await mountView()
    await type('subject', 'Factura :number lista')
    await (document.body.querySelector('[data-field="title"] [data-restore]') as HTMLButtonElement).click()
    await flushPromises()
    await reason('Volver al original')
    await btn('Restaurar').click()
    await flushPromises()
    expect(api.restoreMessage).toHaveBeenCalledWith('invoice', 'es', ['title'], 'Volver al original')
    expect(input('title').value).toBe('Gracias por tu compra')
    expect(input('subject').value).toBe('Factura :number lista')
    w.unmount()
  })

  it('restores a whole language without fields', async () => {
    api.getMessage.mockImplementation(async (_k: string, l: Locale) => detail(l, { title: f('Otro', { default: 'Gracias por tu compra', overridden: true }) }))
    api.restoreMessage.mockResolvedValue(detail('es'))
    const w = await mountView()
    await (document.body.querySelector('[data-restore-all]') as HTMLButtonElement).click()
    await flushPromises()
    await reason('Volver todo al original')
    await btn('Restaurar todo').click()
    await flushPromises()
    expect(api.restoreMessage).toHaveBeenCalledWith('invoice', 'es', null, 'Volver todo al original')
    w.unmount()
  })

  it('sends a test to the caller and shows the 429', async () => {
    api.sendTest.mockResolvedValueOnce({ sent: true }).mockRejectedValueOnce({ response: { status: 429, data: {} } })
    const w = await mountView()
    await btn('Enviar prueba').click()
    await flushPromises()
    expect(document.body.textContent).toContain('yo@cwm.test')
    await reason('Revisar el diseño')
    await document.body.querySelector<HTMLButtonElement>('.v-card-actions .v-btn--variant-flat')!.click()
    await flushPromises()
    expect(api.sendTest).toHaveBeenCalledWith('invoice', 'es', 'Revisar el diseño')
    expect(document.body.textContent).toContain('Enviamos la prueba a yo@cwm.test')
    await btn('Enviar prueba').click()
    await flushPromises()
    await reason('Otra prueba más')
    await document.body.querySelector<HTMLButtonElement>('.v-card-actions .v-btn--variant-flat')!.click()
    await flushPromises()
    expect(document.body.textContent).toContain('Demasiados intentos')
    w.unmount()
  })

  it('only reads without admin.messages.manage', async () => {
    const w = await mountView(['admin.events.view'])
    expect(input('subject').readOnly).toBe(true)
    expect(btn('Guardar cambios')).toBeUndefined()
    expect(document.body.textContent).toContain('acceso de lectura')
    w.unmount()
  })

  it('shows not found and a retry on errors', async () => {
    api.getMessage.mockRejectedValue({ response: { status: 404, data: { code: 'message_not_found' } } })
    const gone = await mountView()
    expect(document.body.textContent).toContain('no existe')
    gone.unmount()
    document.body.innerHTML = ''
    api.getMessage.mockRejectedValue({ response: { status: 500, data: {} } })
    const w = await mountView()
    expect(document.body.textContent).toContain('No pudimos cargar este mensaje.')
    w.unmount()
  })

  it('does not load anything without permission to view', async () => {
    const w = await mountView([])
    expect(api.getMessage).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('No tienes permiso')
    w.unmount()
  })
})
