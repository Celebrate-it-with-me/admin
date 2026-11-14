import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('@/services/reauth', () => ({ askReauth: vi.fn() }))

import { getStatus, getSummary, listMessages, listTemplates, sendTest, submitTemplate, syncTemplates, updateTemplate } from './whatsappApi'
import * as mock from './mock'

beforeEach(() => { Object.values(http).forEach(fn => fn.mockReset()) })

describe('whatsappApi (real calls, contract paths and snake_case bodies)', () => {
  it('reads status and summary', async () => {
    http.get.mockResolvedValueOnce({ data: { data: { driver: 'fake' } } })
    expect((await getStatus()).driver).toBe('fake')
    expect(http.get).toHaveBeenCalledWith('whatsapp/status')
    http.get.mockResolvedValueOnce({ data: { data: { total: 3 } } })
    await getSummary({ from: '2026-11-01', to: '' })
    expect(http.get).toHaveBeenLastCalledWith('whatsapp/summary', { params: { from: '2026-11-01' } })
  })

  it('lists messages with the filters as query and returns data and meta', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { page: 1, perPage: 15, total: 1 } } })
    const res = await listMessages({ status: 'failed', eventId: 4, templateKey: 'invitation', q: 'rosa' }, { from: '', to: '' }, 1, 15)
    expect(http.get).toHaveBeenCalledWith('whatsapp/messages', { params: { page: 1, per_page: 15, status: 'failed', event_id: 4, template_key: 'invitation', q: 'rosa' } })
    expect(res.meta.total).toBe(1)
  })

  it('normalizes the templates it reads', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: 1, variables: [{ name: 'guest_name' }], buttons: null }] } })
    const [t] = await listTemplates()
    expect(t.variables).toEqual(['guest_name'])
    expect(t.buttons).toEqual([])
  })

  it('sends the reason with every write, on the contract routes', async () => {
    http.put.mockResolvedValue({ data: { data: { id: 2, variables: [] } } })
    await updateTemplate(2, { body: 'Hola {{1}}', reason: 'Ajuste de tono' })
    expect(http.put).toHaveBeenCalledWith('whatsapp/templates/2', { body: 'Hola {{1}}', reason: 'Ajuste de tono' })
    http.post.mockResolvedValue({ data: { data: { id: 2, variables: [] } } })
    await submitTemplate(2, 'Primera versión')
    expect(http.post).toHaveBeenLastCalledWith('whatsapp/templates/2/submit', { reason: 'Primera versión' })
    http.post.mockResolvedValue({ data: { data: [] } })
    await syncTemplates('Revisión semanal')
    expect(http.post).toHaveBeenLastCalledWith('whatsapp/templates/sync', { reason: 'Revisión semanal' })
    http.post.mockResolvedValue({ data: { data: { id: 9 } } })
    await sendTest({ to: '+13055550123', templateKey: 'invitation', locale: 'es', reason: 'Prueba' })
    expect(http.post).toHaveBeenLastCalledWith('whatsapp/test', { to: '+13055550123', template_key: 'invitation', locale: 'es', reason: 'Prueba' })
  })
})

describe('mock (follows the contract errors)', () => {
  it('rejects a body that lost a variable with 422 variables_changed', async () => {
    const t = (await mock.listTemplates()).find(x => x.key === 'invitation' && x.locale === 'es')!
    await expect(mock.updateTemplate(t.id, { body: 'Hola {{1}} sin el resto', reason: 'Prueba' })).rejects.toMatchObject({ response: { status: 422, data: { errors: { body: ['variables_changed'] } } } })
  })

  it('answers invalid_phone, template_not_approved and the 5-character reason rule', async () => {
    await expect(mock.sendTest({ to: '3055550123', template_key: 'invitation', locale: 'es', reason: 'Prueba' })).rejects.toMatchObject({ response: { status: 422, data: { errors: { to: ['invalid_phone'] } } } })
    await expect(mock.sendTest({ to: '+13055550123', template_key: 'padrino_reminder', locale: 'es', reason: 'Prueba' })).rejects.toMatchObject({ response: { status: 409, data: { code: 'template_not_approved' } } })
    await expect(mock.sendTest({ to: '+13055550123', template_key: 'invitation', locale: 'es', reason: 'abc' })).rejects.toMatchObject({ response: { status: 422, data: { errors: { reason: ['reason'] } } } })
    const sent = await mock.sendTest({ to: '+13055550123', template_key: 'invitation', locale: 'es', reason: 'Prueba' })
    expect(sent).toMatchObject({ status: 'queued', eventId: null, guestId: null, to: '+1305***0123' })
  })

  it('answers 409 whatsapp_unavailable when the driver is not configured', async () => {
    localStorage.setItem('wa_mock_mode', 'unconfigured')
    await expect(mock.syncTemplates('Revisión')).rejects.toMatchObject({ response: { status: 409, data: { code: 'whatsapp_unavailable' } } })
    await expect(mock.submitTemplate(1, 'Revisión')).rejects.toMatchObject({ response: { status: 409, data: { code: 'whatsapp_unavailable' } } })
    expect((await mock.getStatus())).toMatchObject({ driver: 'meta', configured: false, phoneNumberId: null })
    localStorage.removeItem('wa_mock_mode')
  })

  it('approves on submit with the fake driver and leaves it submitted with meta', async () => {
    const list = await mock.listTemplates()
    const draft = list.find(t => t.status === 'draft')!
    expect((await mock.submitTemplate(draft.id, 'Va a aprobación')).status).toBe('approved')
    localStorage.setItem('wa_mock_mode', 'meta')
    const other = list.find(t => t.key === 'save_the_date' && t.locale === 'en')!
    expect((await mock.submitTemplate(other.id, 'Corregida')).status).toBe('submitted')
    const synced = await mock.syncTemplates('Revisión')
    expect(synced.find(t => t.id === other.id)!.status).toBe('approved')
    localStorage.removeItem('wa_mock_mode')
  })

  it('filters messages and paginates with meta.total', async () => {
    const all = await mock.listMessages({ status: null, eventId: null, templateKey: null, q: '' }, { from: '', to: '' }, 1, 15)
    expect(all.data).toHaveLength(15)
    const failed = await mock.listMessages({ status: 'failed', eventId: null, templateKey: null, q: '' }, { from: '', to: '' }, 1, 100)
    expect(failed.data.every(m => m.status === 'failed')).toBe(true)
    expect(failed.meta.total).toBe(failed.data.length)
    const summary = await mock.getSummary({ from: '', to: '' })
    expect(summary.total).toBe(summary.queued + summary.sent + summary.delivered + summary.read + summary.failed)
  })
})
