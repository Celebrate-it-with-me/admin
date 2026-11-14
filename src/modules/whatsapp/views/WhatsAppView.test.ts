import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { mountUi } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import type { WaMessage, WaStatus, WaSummary, WaTemplate } from '../types'
import WhatsAppView from './WhatsAppView.vue'

const api = vi.hoisted(() => ({
  getStatus: vi.fn(), getSummary: vi.fn(), listMessages: vi.fn(), listTemplates: vi.fn(), updateTemplate: vi.fn(),
  submitTemplate: vi.fn(), syncTemplates: vi.fn(), sendTest: vi.fn(), searchEvents: vi.fn(),
}))
vi.mock('../services/whatsappApi', () => api)
// The message detail links to the event page.
vi.mock('vue-router', async importOriginal => ({ ...(await importOriginal<typeof import('vue-router')>()), useRoute: () => ({ query: {} }) }))

const status = (over: Partial<WaStatus> = {}): WaStatus => ({
  driver: 'fake', configured: true, phoneNumberId: null, businessAccountId: null, webhookUrl: 'https://api.test/api/v1/webhooks/whatsapp',
  verifyTokenSet: false, appSecretSet: false, lastWebhookAt: null, ...over,
})
const summary: WaSummary = { total: 10, queued: 1, sent: 2, delivered: 3, read: 3, failed: 1, deliveryRate: 85.7 }
const message = (over: Partial<WaMessage>): WaMessage => ({
  id: 1, eventId: 4, eventName: 'Los XV de Valentina', guestId: 9, guestName: 'Tía Rosa', templateKey: 'invitation', locale: 'es', to: '+1305***0123', status: 'read',
  errorCode: null, errorMessage: null, waMessageId: 'wamid.1', queuedAt: '2026-11-14T10:00:00Z', sentAt: '2026-11-14T10:00:05Z', deliveredAt: '2026-11-14T10:00:08Z', readAt: '2026-11-14T10:05:00Z', failedAt: null, ...over,
})
const tpl = (over: Partial<WaTemplate>): WaTemplate => ({
  id: 1, key: 'invitation', locale: 'es', metaName: 'quinvite_invitation_es', category: 'marketing', body: 'Hola {{1}}, estás invitado a {{2}} el {{3}}: {{4}}', buttons: [],
  variables: ['guest_name', 'event_name', 'event_date', 'link'], status: 'approved', rejectionReason: null, submittedAt: null, approvedAt: '2026-11-01T00:00:00Z', updatedAt: null, ...over,
})
const messages = () => [
  message({ id: 1 }),
  message({ id: 2, guestName: 'Carlos Pérez', status: 'failed', errorCode: '131026', errorMessage: 'Message undeliverable', readAt: null, deliveredAt: null, failedAt: '2026-11-14T10:00:06Z' }),
]
const templates = () => [
  tpl({ id: 1 }),
  tpl({ id: 2, key: 'save_the_date', status: 'rejected', rejectionReason: 'Parece promocional', approvedAt: null, metaName: 'quinvite_std_es' }),
  tpl({ id: 3, key: 'padrino_reminder', status: 'draft', approvedAt: null, variables: ['padrino_name', 'event_name', 'item_name', 'amount', 'due_date'], body: '{{1}} {{2}} {{3}} {{4}} {{5}}' }),
]

const mountView = async (permissions = ['admin.events.view', 'admin.whatsapp.manage']) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useCurrentUserStore().user = { id: 1, email: 'admin@cwm.test', permissions } as never
  const w = mountUi(WhatsAppView, { global: { plugins: [pinia], stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
  await flushPromises()
  return w
}

const typeInto = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => { el.value = value; el.dispatchEvent(new Event('input')); await nextTick() }
const dialogButton = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.v-card-actions button')).find(b => b.textContent?.includes(label))!
const goTemplates = async (w: Awaited<ReturnType<typeof mountView>>) => {
  await w.findAll('.v-tab').find(t => t.text().includes('Plantillas'))!.trigger('click')
  await flushPromises()
}
const reasonField = () => document.body.querySelector<HTMLTextAreaElement>('.v-dialog textarea[maxlength="500"]')!

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset())
  api.getStatus.mockResolvedValue(status())
  api.getSummary.mockResolvedValue(summary)
  api.listMessages.mockResolvedValue({ data: messages(), meta: { page: 1, perPage: 15, total: 2 } })
  api.listTemplates.mockResolvedValue(templates())
  api.searchEvents.mockResolvedValue([{ id: 4, name: 'Los XV de Valentina' }])
})
afterEach(() => { document.body.innerHTML = '' })

describe('WhatsAppView', () => {
  it('shows the driver, the state and how to connect when it is the fake driver', async () => {
    const w = await mountView()
    expect(w.find('[data-testid="connection-state"]').text()).toContain('Modo de prueba')
    expect(w.find('[data-testid="driver"]').text()).toContain('fake')
    expect(w.find('[data-testid="how-to-connect"]').text()).toContain('WHATSAPP_DRIVER=meta')
    expect((w.find('.webhook input').element as HTMLInputElement).value).toBe('https://api.test/api/v1/webhooks/whatsapp')
    w.unmount()
  })

  it('shows a connected meta account with masked ids and no how-to', async () => {
    api.getStatus.mockResolvedValue(status({ driver: 'meta', phoneNumberId: '...4821', businessAccountId: '...9037', verifyTokenSet: true, appSecretSet: true, lastWebhookAt: new Date(Date.now() - 600_000).toISOString() }))
    const w = await mountView()
    expect(w.find('[data-testid="connection-state"]').text()).toContain('Conectado a Meta')
    expect(w.text()).toContain('...4821')
    expect(w.text()).toContain('hace 10 min')
    expect(w.find('[data-testid="how-to-connect"]').exists()).toBe(false)
    w.unmount()
  })

  it('says meta is not connected when it has no credentials', async () => {
    api.getStatus.mockResolvedValue(status({ driver: 'meta', configured: false }))
    const w = await mountView()
    expect(w.find('[data-testid="connection-state"]').text()).toContain('Sin conectar')
    expect(w.find('[data-testid="how-to-connect"]').text()).toContain('todavía no está conectado')
    expect(w.text()).toContain('Sin configurar')
    w.unmount()
  })

  it('copies the webhook url', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const w = await mountView()
    await w.findAll('button').find(b => b.text().includes('Copiar'))!.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('https://api.test/api/v1/webhooks/whatsapp')
    expect(w.text()).toContain('Copiada.')
    w.unmount()
  })

  it('shows the delivery summary', async () => {
    const w = await mountView()
    expect(w.find('[data-stat="total"]').text()).toContain('10')
    expect(w.find('[data-stat="failed"]').text()).toContain('1')
    expect(w.find('[data-stat="deliveryRate"]').text()).toContain('85.7 %')
    w.unmount()
  })

  it('lists messages with a chip and its label, and opens the readable failure', async () => {
    const w = await mountView()
    expect(w.find('[data-status="read"]').text()).toContain('Leído')
    expect(w.find('[data-status="failed"]').text()).toContain('Fallido')
    expect(w.text()).toContain('Tía Rosa')
    expect(w.text()).toContain('+1305***0123')
    Array.from(document.body.querySelectorAll<HTMLElement>('tbody tr')).find(r => r.textContent?.includes('Carlos Pérez'))!.dispatchEvent(new Event('click'))
    await flushPromises()
    const detail = document.body.querySelector('[data-testid="message-detail"]')!
    expect(detail.querySelector('[data-testid="failure"]')!.textContent).toContain('no tiene WhatsApp')
    expect(detail.querySelector('[data-testid="failure"]')!.textContent).toContain('131026')
    w.unmount()
  })

  it('sends the search to the API and says when nothing matches', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const w = await mountView()
    api.listMessages.mockResolvedValue({ data: [], meta: { page: 1, perPage: 15, total: 0 } })
    const search = w.findAll('.v-text-field').find(f => f.text().includes('Buscar por teléfono'))!.find('input')
    await typeInto(search.element as HTMLInputElement, '+1786')
    await vi.advanceTimersByTimeAsync(400)
    await flushPromises()
    expect(api.listMessages).toHaveBeenLastCalledWith(expect.objectContaining({ q: '+1786' }), { from: '', to: '' }, 1, 15)
    expect(w.text()).toContain('No hay mensajes con estos filtros.')
    vi.useRealTimers()
    w.unmount()
  })

  it('says it could not load the messages and retries', async () => {
    api.listMessages.mockRejectedValueOnce(new Error('boom'))
    const w = await mountView()
    expect(w.text()).toContain('No pudimos cargar los mensajes.')
    await w.findAll('button').find(b => b.text() === 'Reintentar' && b.element.closest('.v-alert')?.textContent?.includes('mensajes'))!.trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('No pudimos cargar los mensajes.')
    w.unmount()
  })

  it('lists the templates with their status, the rejection reason and fixed variable chips', async () => {
    const w = await mountView()
    await goTemplates(w)
    expect(w.find('[data-template="1"]').text()).toContain('Aprobada')
    expect(w.find('[data-template="1"]').text()).toContain('{{1}}')
    expect(w.find('[data-template="2"] [data-testid="rejection"]').text()).toContain('Parece promocional')
    expect(w.find('[data-template="3"]').text()).toContain('Borrador')
    expect(w.find('[data-template="3"]').text()).toContain('Padrinos')
    w.unmount()
  })

  it('explains variables_changed under the body and keeps the dialog open', async () => {
    api.updateTemplate.mockRejectedValue({ response: { status: 422, data: { errors: { body: ['variables_changed'] } } } })
    const w = await mountView()
    await goTemplates(w)
    ;(w.find('[data-template="1"] button[aria-label^="Editar"]').element as HTMLButtonElement).click()
    await flushPromises()
    const body = document.body.querySelector<HTMLTextAreaElement>('.v-dialog textarea:not([maxlength])')!
    await typeInto(body, 'Hola {{1}}, ven a la fiesta {{2}} {{3}} {{4}}!')
    await typeInto(reasonField(), 'Texto más cálido')
    dialogButton('Guardar texto').click()
    await flushPromises()
    expect(api.updateTemplate).toHaveBeenCalledWith(1, { reason: 'Texto más cálido', body: 'Hola {{1}}, ven a la fiesta {{2}} {{3}} {{4}}!' })
    expect(document.body.textContent).toContain('No puedes quitar, repetir ni cambiar el orden de las variables')
    expect(document.body.querySelector('.v-dialog')).toBeTruthy()
    w.unmount()
  })

  it('warns about a missing variable before saving and keeps save off', async () => {
    const w = await mountView()
    await goTemplates(w)
    ;(w.find('[data-template="1"] button[aria-label^="Editar"]').element as HTMLButtonElement).click()
    await flushPromises()
    await typeInto(document.body.querySelector<HTMLTextAreaElement>('.v-dialog textarea:not([maxlength])')!, 'Hola {{1}}')
    expect(document.body.textContent).toContain('Falta {{2}}, {{3}}, {{4}}.')
    w.unmount()
  })

  it('submits a template for approval with a reason and updates its chip', async () => {
    api.submitTemplate.mockResolvedValue(tpl({ id: 2, key: 'save_the_date', status: 'submitted' }))
    const w = await mountView()
    await goTemplates(w)
    ;(w.find('[data-template="2"] button[aria-label^="Enviar a aprobación"]').element as HTMLButtonElement).click()
    await flushPromises()
    await typeInto(reasonField(), 'Corregido el texto')
    dialogButton('Enviar a aprobación').click()
    await flushPromises()
    expect(api.submitTemplate).toHaveBeenCalledWith(2, 'Corregido el texto')
    expect(w.find('[data-template="2"]').text()).toContain('Enviada')
    w.unmount()
  })

  it('shows the 409 whatsapp_unavailable on sync', async () => {
    api.syncTemplates.mockRejectedValue({ response: { status: 409, data: { code: 'whatsapp_unavailable' } } })
    const w = await mountView()
    await goTemplates(w)
    await w.findAll('button').find(b => b.text().includes('Sincronizar estados'))!.trigger('click')
    await flushPromises()
    await typeInto(reasonField(), 'Revisión semanal')
    dialogButton('Sincronizar').click()
    await flushPromises()
    expect(document.body.textContent).toContain('WhatsApp todavía no está conectado a Meta')
    w.unmount()
  })

  it('sends a test and shows invalid_phone on the phone field', async () => {
    api.sendTest.mockRejectedValueOnce({ response: { status: 422, data: { errors: { to: ['invalid_phone'] } } } })
    const w = await mountView()
    await goTemplates(w)
    await w.findAll('button').find(b => b.text().includes('Enviar prueba'))!.trigger('click')
    await flushPromises()
    await typeInto(document.body.querySelector<HTMLInputElement>('.v-dialog input[type="tel"]')!, '305')
    await typeInto(reasonField(), 'Probar el flujo')
    dialogButton('Enviar prueba').click()
    await flushPromises()
    expect(api.sendTest).toHaveBeenCalledWith({ to: '305', templateKey: 'invitation', locale: 'es', reason: 'Probar el flujo' })
    expect(document.body.textContent).toContain('Ese teléfono no es válido')

    api.sendTest.mockResolvedValueOnce(message({ id: 99, to: '+1305***0123', status: 'queued', guestName: null }))
    await typeInto(document.body.querySelector<HTMLInputElement>('.v-dialog input[type="tel"]')!, '+13055550123')
    dialogButton('Enviar prueba').click()
    await flushPromises()
    expect(w.text()).toContain('Pusimos en cola la prueba')
    w.unmount()
  })

  it('is read-only without admin.whatsapp.manage', async () => {
    const w = await mountView(['admin.events.view'])
    await goTemplates(w)
    expect(w.text()).toContain('Tienes acceso de lectura')
    expect(w.findAll('button').some(b => b.text().includes('Sincronizar estados'))).toBe(false)
    expect(w.find('[data-template="1"] button[aria-label^="Editar"]').exists()).toBe(false)
    expect(w.find('[data-template="1"]').text()).toContain('Aprobada')
    w.unmount()
  })

  it('shows no data at all without admin.events.view', async () => {
    const w = await mountView([])
    expect(w.find('[data-testid="forbidden"]').exists()).toBe(true)
    expect(api.getStatus).not.toHaveBeenCalled()
    w.unmount()
  })
})
