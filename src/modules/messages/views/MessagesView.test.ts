import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { mountUi } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import type { Message } from '../types'
import MessagesView from './MessagesView.vue'

const api = vi.hoisted(() => ({ listMessages: vi.fn() }))
vi.mock('../services/messagesApi', () => api)
const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', async importOriginal => ({ ...(await importOriginal<typeof import('vue-router')>()), useRouter: () => ({ push }) }))

const msg = (key: string, name: string, over: Partial<Message> = {}): Message => ({
  key, name, description: `Descripción de ${name}`, locales: ['es', 'en'], editableFields: ['subject'], overridden: { es: false, en: false }, updatedAt: null, ...over,
})
const SAMPLE = [msg('confirm', 'Confirmar correo'), msg('invoice', 'Factura', { overridden: { es: true, en: false }, updatedAt: '2026-11-10T12:00:00Z' })]

const mountView = async (permissions = ['admin.events.view']) => {
  setActivePinia(createPinia())
  useCurrentUserStore().user = { email: 'a@cwm.test', permissions } as never
  const w = mountUi(MessagesView)
  await flushPromises()
  return w
}
const row = (key: string) => document.body.querySelector<HTMLElement>(`[data-message="${key}"]`)!

beforeEach(() => { api.listMessages.mockReset(); push.mockReset(); api.listMessages.mockResolvedValue(SAMPLE) })
afterEach(() => { document.body.innerHTML = '' })

describe('MessagesView', () => {
  it('lists the messages with an edited chip per language (text + icon)', async () => {
    const w = await mountView()
    expect(row('invoice').querySelector('[data-locale="es"]')!.textContent).toContain('Editado')
    expect(row('invoice').querySelector('[data-locale="en"]')!.textContent).toContain('Original')
    expect(row('invoice').querySelector('[data-locale="es"] .mdi-pencil-outline')).not.toBeNull()
    expect(row('confirm').querySelector('[data-locale="es"]')!.textContent).toContain('Original')
    w.unmount()
  })

  it('shows a skeleton while it loads', async () => {
    api.listMessages.mockReturnValue(new Promise(() => {}))
    setActivePinia(createPinia())
    useCurrentUserStore().user = { email: 'a@cwm.test', permissions: ['admin.events.view'] } as never
    const w = mountUi(MessagesView)
    await nextTick()
    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    w.unmount()
  })

  it('filters by search and offers to clear it when nothing matches', async () => {
    const w = await mountView()
    await w.find('input').setValue('factura')
    expect(row('confirm')).toBeNull()
    expect(row('invoice')).not.toBeNull()
    await w.find('input').setValue('zzz')
    expect(w.text()).toContain('Ningún mensaje coincide')
    w.unmount()
  })

  it('shows the error with a retry', async () => {
    api.listMessages.mockRejectedValueOnce({ response: { status: 500, data: {} } }).mockResolvedValueOnce(SAMPLE)
    const w = await mountView()
    expect(w.text()).toContain('No pudimos cargar los mensajes.')
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(row('confirm')).not.toBeNull()
    w.unmount()
  })

  it('opens the editor of a message', async () => {
    const w = await mountView()
    await (document.body.querySelector('button[aria-label="Editar «Factura»"]') as HTMLButtonElement).click()
    expect(push).toHaveBeenCalledWith({ name: 'MessageEditor', params: { key: 'invoice' } })
    w.unmount()
  })

  it('does not call the API without permission', async () => {
    const w = await mountView([])
    expect(api.listMessages).not.toHaveBeenCalled()
    expect(w.text()).toContain('No tienes permiso')
    w.unmount()
  })
})
