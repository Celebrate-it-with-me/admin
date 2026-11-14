import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountUi } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import type { InvitationPreview } from '../types'
import AcceptInviteView from './AcceptInviteView.vue'

const api = vi.hoisted(() => ({ getInvitation: vi.fn(), acceptInvitation: vi.fn() }))
vi.mock('../services/teamApi', () => api)
const nav = vi.hoisted(() => ({ query: {} as Record<string, string>, push: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: nav.query }), useRouter: () => ({ push: nav.push }) }))
vi.mock('@/services/axios', () => ({ API: { defaults: { headers: { common: {} } }, get: vi.fn(), post: vi.fn() } }))

const preview = (over: Partial<InvitationPreview> = {}): InvitationPreview => ({
  name: 'Carlos Ruiz', email: 'carlos@cwm.test', role: 'support', expiresAt: new Date(Date.now() + 2 * 86_400_000 + 60_000).toISOString(), accountExists: false, requiresTwoFactor: true, ...over,
})
const http = (status: number, code: string) => ({ response: { status, data: { code } } })

let store: ReturnType<typeof useCurrentUserStore>
const mountPage = async (token: string | null = 'tok') => {
  nav.query = token === null ? {} : { token }
  const pinia = createPinia(); setActivePinia(pinia)
  store = useCurrentUserStore()
  store.startSession = vi.fn().mockResolvedValue(undefined) as never
  store.completeTwoFactor = vi.fn() as never
  const w = mountUi(AcceptInviteView, { global: { plugins: [pinia] } })
  await flushPromises()
  return w
}
const typeInto = async (w: Awaited<ReturnType<typeof mountPage>>, label: string, value: string) => {
  const field = w.findAll('.v-field').find(f => f.text().includes(label))!
  const input = field.find('input')
  ;(input.element as HTMLInputElement).value = value
  await input.trigger('input')
}
const submitButton = (w: Awaited<ReturnType<typeof mountPage>>) => w.find('button[type="submit"]')

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()); nav.push.mockReset() })
afterEach(() => { document.body.innerHTML = '' })

describe('AcceptInviteView', () => {
  it('shows who was invited, with which role, and when it expires', async () => {
    api.getInvitation.mockResolvedValue(preview())
    const w = await mountPage()
    expect(api.getInvitation).toHaveBeenCalledWith('tok')
    expect(w.text()).toContain('carlos@cwm.test')
    expect(w.text()).toContain('Soporte')
    expect(w.text()).toContain('La invitación vence en 2 días')
    expect(w.text()).toContain('verificación en dos pasos')
    expect(w.text()).not.toContain('Tu nombre')
    w.unmount()
  })

  it('treats a missing token as invalid without calling the API', async () => {
    const w = await mountPage(null)
    expect(api.getInvitation).not.toHaveBeenCalled()
    expect(w.text()).toContain('Esta invitación no sirve')
    w.unmount()
  })

  it('invalid (404) and expired (410) say different things', async () => {
    api.getInvitation.mockRejectedValue(http(404, 'invitation_invalid'))
    let w = await mountPage()
    expect(w.text()).toContain('no existe, ya se usó o alguien lo revocó')
    w.unmount()
    api.getInvitation.mockRejectedValue(http(410, 'invitation_expired'))
    w = await mountPage()
    expect(w.text()).toContain('Esta invitación venció')
    expect(w.text()).toContain('Pide a quien te invitó que te la reenvíe')
    w.unmount()
  })

  it('offers a retry on a network error', async () => {
    api.getInvitation.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(preview())
    const w = await mountPage()
    expect(w.text()).toContain('No hay conexión con el servidor')
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('carlos@cwm.test')
    w.unmount()
  })

  it('does not submit until the password is long enough and repeated, and lists the rules', async () => {
    api.getInvitation.mockResolvedValue(preview())
    const w = await mountPage()
    expect(w.text()).toContain('Al menos 12 caracteres')
    await typeInto(w, 'Contraseña nueva', 'corta')
    await typeInto(w, 'Repite la contraseña', 'corta')
    await submitButton(w).trigger('submit')
    await flushPromises()
    expect(api.acceptInvitation).not.toHaveBeenCalled()
    w.unmount()
  })

  it('accepts, starts the session and sends her to set up two-factor when the API says so', async () => {
    api.getInvitation.mockResolvedValue(preview())
    api.acceptInvitation.mockResolvedValue({ kind: 'session', token: 'T0KEN', twoFactorSetupRequired: true })
    const w = await mountPage()
    await typeInto(w, 'Contraseña nueva', 'una-clave-bien-larga')
    await typeInto(w, 'Repite la contraseña', 'una-clave-bien-larga')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.acceptInvitation).toHaveBeenCalledWith('tok', { password: 'una-clave-bien-larga', password_confirmation: 'una-clave-bien-larga', device: expect.any(String) })
    expect(store.startSession).toHaveBeenCalledWith('T0KEN')
    expect(w.text()).toContain('Tu cuenta está lista')
    expect(w.text()).toContain('Activar los dos pasos')
    await w.findAll('button').find(b => b.text() === 'Activar los dos pasos')!.trigger('click')
    expect(nav.push).toHaveBeenCalledWith({ name: 'Account', query: { tab: 'security' } })
    w.unmount()
  })

  it('goes to the dashboard when no two-factor setup is needed', async () => {
    api.getInvitation.mockResolvedValue(preview({ requiresTwoFactor: false }))
    api.acceptInvitation.mockResolvedValue({ kind: 'session', token: 'T', twoFactorSetupRequired: false })
    const w = await mountPage()
    await typeInto(w, 'Contraseña nueva', 'una-clave-bien-larga')
    await typeInto(w, 'Repite la contraseña', 'una-clave-bien-larga')
    await w.find('form').trigger('submit')
    await flushPromises()
    await w.findAll('button').find(b => b.text() === 'Entrar al panel')!.trigger('click')
    expect(nav.push).toHaveBeenCalledWith({ name: 'MainDashboard' })
    w.unmount()
  })

  it('asks for the name when a new account has none', async () => {
    api.getInvitation.mockResolvedValue(preview({ name: '' }))
    api.acceptInvitation.mockResolvedValue({ kind: 'session', token: 'T', twoFactorSetupRequired: false })
    const w = await mountPage()
    expect(w.text()).toContain('Tu nombre')
    expect(w.text()).not.toContain('Tu contraseña actual de Quinvite')
    await typeInto(w, 'Tu nombre', 'Marisol')
    await typeInto(w, 'Contraseña nueva', 'una-clave-bien-larga')
    await typeInto(w, 'Repite la contraseña', 'una-clave-bien-larga')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.acceptInvitation).toHaveBeenCalledWith('tok', { name: 'Marisol', password: 'una-clave-bien-larga', password_confirmation: 'una-clave-bien-larga', device: expect.any(String) })
    w.unmount()
  })

  it('an existing account only confirms its current password: no new-password fields, body is just current_password', async () => {
    api.getInvitation.mockResolvedValue(preview({ name: '', accountExists: true }))
    api.acceptInvitation.mockResolvedValue({ kind: 'session', token: 'T', twoFactorSetupRequired: false })
    const w = await mountPage()
    expect(w.text()).toContain('Tu contraseña actual de Quinvite')
    expect(w.text()).toContain('Usarás la contraseña de tu cuenta de Quinvite; no la cambiaremos.')
    expect(w.text()).not.toContain('Tu nombre')
    expect(w.text()).not.toContain('Contraseña nueva')
    expect(w.text()).not.toContain('Repite la contraseña')
    await submitButton(w).trigger('submit')
    await flushPromises()
    expect(api.acceptInvitation).not.toHaveBeenCalled()
    expect(w.text()).toContain('Escribe tu contraseña actual de Quinvite.')
    await typeInto(w, 'Tu contraseña actual de Quinvite', 'password')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(api.acceptInvitation).toHaveBeenCalledWith('tok', { current_password: 'password', device: expect.any(String) })
    w.unmount()
  })

  it('shows the field error of a wrong current password', async () => {
    api.getInvitation.mockResolvedValue(preview({ accountExists: true }))
    api.acceptInvitation.mockRejectedValue({ response: { status: 422, data: { errors: { current_password: ['invalid_current_password'] } } } })
    const w = await mountPage()
    await typeInto(w, 'Tu contraseña actual de Quinvite', 'mala')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('La contraseña actual no es correcta.')
    w.unmount()
  })

  it('switches to the expired screen when the link expires while she fills the form', async () => {
    api.getInvitation.mockResolvedValue(preview())
    api.acceptInvitation.mockRejectedValue(http(410, 'invitation_expired'))
    const w = await mountPage()
    await typeInto(w, 'Contraseña nueva', 'una-clave-bien-larga')
    await typeInto(w, 'Repite la contraseña', 'una-clave-bien-larga')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Esta invitación venció')
    w.unmount()
  })

  it('continues with the two-factor challenge when the account already had it', async () => {
    api.getInvitation.mockResolvedValue(preview({ accountExists: true }))
    api.acceptInvitation.mockResolvedValue({ kind: 'challenge', challenge: 'CH' })
    const w = await mountPage()
    await typeInto(w, 'Tu contraseña actual de Quinvite', 'password')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.text()).toContain('Un último paso')
    expect(store.startSession).not.toHaveBeenCalled()
    ;(store.completeTwoFactor as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200 })
    await typeInto(w, 'Código de verificación', '123456')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(store.completeTwoFactor).toHaveBeenCalledWith('CH', { code: '123456' }, expect.any(String))
    expect(w.text()).toContain('Tu cuenta está lista')
    w.unmount()
  })
})
