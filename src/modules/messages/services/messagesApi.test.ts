import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('./mock', () => ({}))

// A developer's .env.local may switch the mock on; these tests are about the real client.
vi.stubEnv('VITE_MESSAGES_MOCK', 'false')
const { getMessage, listMessages, previewMessage, restoreMessage, saveMessage, sendTest } = await import('./messagesApi')

beforeEach(() => { Object.values(http).forEach(fn => fn.mockReset()) })

describe('messagesApi', () => {
  it('lists', async () => {
    http.get.mockResolvedValue({ data: { data: [{ key: 'confirm' }] } })
    expect(await listMessages()).toEqual([{ key: 'confirm' }])
    expect(http.get).toHaveBeenCalledWith('messages')
  })
  it('reads one message with its locale as query', async () => {
    http.get.mockResolvedValue({ data: { data: { key: 'invite-registered' } } })
    await getMessage('invite-registered', 'en')
    expect(http.get).toHaveBeenCalledWith('messages/invite-registered', { params: { locale: 'en' } })
  })
  it('saves with locale, fields and reason', async () => {
    http.put.mockResolvedValue({ data: { data: { key: 'confirm' } } })
    await saveMessage('confirm', 'es', { subject: 'Hola :name' }, 'Texto más cálido')
    expect(http.put).toHaveBeenCalledWith('messages/confirm', { locale: 'es', fields: { subject: 'Hola :name' }, reason: 'Texto más cálido' })
  })
  it('restores some fields, sending the body as the request data', async () => {
    http.delete.mockResolvedValue({ data: { data: {} } })
    await restoreMessage('confirm', 'es', ['subject'], 'Volver al original')
    expect(http.delete).toHaveBeenCalledWith('messages/confirm', { data: { locale: 'es', fields: ['subject'], reason: 'Volver al original' } })
  })
  it('restores the whole language without `fields`', async () => {
    http.delete.mockResolvedValue({ data: { data: {} } })
    await restoreMessage('confirm', 'en', null, 'Volver al original')
    expect(http.delete.mock.calls[0][1]).toEqual({ data: { locale: 'en', reason: 'Volver al original' } })
  })
  it('previews with only the edited fields, or none', async () => {
    http.post.mockResolvedValue({ data: { data: { subject: 's', preheader: '', html: '<p>x</p>' } } })
    await previewMessage('confirm', 'es', { title: 'Hola' })
    expect(http.post).toHaveBeenCalledWith('messages/confirm/preview', { locale: 'es', fields: { title: 'Hola' } })
    await previewMessage('confirm', 'es', {})
    expect(http.post).toHaveBeenLastCalledWith('messages/confirm/preview', { locale: 'es' })
  })
  it('sends a test to the caller by default, or to an address', async () => {
    http.post.mockResolvedValue({ data: { data: { sent: true } } })
    expect(await sendTest('confirm', 'es', 'Probar el diseño')).toEqual({ sent: true })
    expect(http.post).toHaveBeenCalledWith('messages/confirm/test', { locale: 'es', reason: 'Probar el diseño' })
    await sendTest('confirm', 'es', 'Probar el diseño', 'soporte@cwm.test')
    expect(http.post).toHaveBeenLastCalledWith('messages/confirm/test', { locale: 'es', to: 'soporte@cwm.test', reason: 'Probar el diseño' })
  })
})
