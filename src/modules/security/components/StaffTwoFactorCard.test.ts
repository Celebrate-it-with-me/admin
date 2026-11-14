import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { mountUi, bodyText } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import type { SecurityState } from '../types'
import StaffTwoFactorCard from './StaffTwoFactorCard.vue'

const api = vi.hoisted(() => ({ fetchSecurity: vi.fn(), setRequireTwoFactor: vi.fn() }))
vi.mock('../services/securityApi', () => api)

const state = (over: Partial<SecurityState> = {}): SecurityState => ({
  enabled: false, enrolled: 1, total: 3, envForced: false,
  notEnrolled: [{ id: 2, name: 'Ana Soporte', email: 'ana@cwm.test' }, { id: 3, name: 'Berta Díaz', email: 'berta@cwm.test' }],
  ...over,
})

const mountCard = async (over: Partial<SecurityState> = {}, user: Record<string, unknown> = {}) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useCurrentUserStore().user = { email: 'admin@cwm.test', permissions: ['admin.security.manage'], security: { twoFactorEnabled: true }, ...user } as never
  api.fetchSecurity.mockResolvedValue(state(over))
  const w = mountUi(StaffTwoFactorCard, { global: { plugins: [pinia], stubs: { 'router-link': { template: '<a><slot /></a>' } } } })
  await flushPromises()
  return w
}

const dialogButton = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.v-card-actions button')).find(b => b.textContent?.includes(label))!

beforeEach(() => { api.fetchSecurity.mockReset(); api.setRequireTwoFactor.mockReset() })
afterEach(() => { document.body.innerHTML = '' })

describe('StaffTwoFactorCard', () => {
  it('shows the coverage, who is missing, and that it is optional today', async () => {
    const w = await mountCard()
    expect(w.text()).toContain('1 de 3 personas ya tiene la verificación en dos pasos')
    expect(w.text()).toContain('Hoy es opcional')
    expect(w.text()).toContain('Ana Soporte')
    expect(w.text()).toContain('berta@cwm.test')
    w.unmount()
  })

  it('says so when everybody already has it', async () => {
    const w = await mountCard({ enrolled: 3, notEnrolled: [] })
    expect(w.text()).toContain('Todas las personas del equipo ya la tienen.')
    w.unmount()
  })

  it('mentions the people beyond the capped list', async () => {
    const w = await mountCard({ enrolled: 0, total: 60, notEnrolled: Array.from({ length: 50 }, (_, i) => ({ id: i, name: `Persona ${i}`, email: `p${i}@cwm.test` })) })
    expect(w.text()).toContain('y 10 personas más.')
    w.unmount()
  })

  it('notes that the environment variable cannot be turned off from here', async () => {
    const w = await mountCard({ envForced: true })
    expect(w.text()).toContain('ADMIN_REQUIRE_2FA_SUPERADMIN')
    expect(w.text()).toContain('no se puede apagar desde el panel')
    w.unmount()
  })

  it('shows an error with a retry when the state cannot be loaded', async () => {
    api.fetchSecurity.mockRejectedValueOnce(new Error('boom'))
    const pinia = createPinia()
    setActivePinia(pinia)
    useCurrentUserStore().user = { email: 'a@b.c', permissions: ['admin.security.manage'] } as never
    const w = mountUi(StaffTwoFactorCard, { global: { plugins: [pinia] } })
    await flushPromises()
    expect(w.text()).toContain('No pudimos cargar el estado de seguridad.')
    api.fetchSecurity.mockResolvedValue(state())
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('1 de 3 personas')
    w.unmount()
  })

  it('asks for a reason with the warning before turning it on, and shows the new state', async () => {
    api.setRequireTwoFactor.mockResolvedValue(state({ enabled: true }))
    const w = await mountCard()
    await w.find('input[type=checkbox]').setValue(true)
    await nextTick(); await nextTick()
    expect(bodyText()).toContain('Quien no la tenga solo podrá entrar a Mi cuenta hasta configurarla.')
    expect(bodyText()).toContain('Hay 2 personas sin ella.')

    const reason = document.body.querySelector('textarea') as HTMLTextAreaElement
    reason.value = 'Política de seguridad'
    reason.dispatchEvent(new Event('input'))
    await nextTick()
    dialogButton('Exigir a todo el personal').click()
    await flushPromises()

    expect(api.setRequireTwoFactor).toHaveBeenCalledWith(true, 'Política de seguridad')
    expect(w.text()).toContain('Es obligatoria para todo el personal.')
    w.unmount()
  })

  it('shows the lock-out message from the server inside the dialog and keeps it open', async () => {
    api.setRequireTwoFactor.mockRejectedValue({ response: { status: 422, data: { code: 'own_two_factor_required' } } })
    const w = await mountCard({}, { security: { twoFactorEnabled: false } })
    expect(w.text()).toContain('Actívala en Mi cuenta')
    await w.find('input[type=checkbox]').setValue(true)
    await nextTick(); await nextTick()
    const reason = document.body.querySelector('textarea') as HTMLTextAreaElement
    reason.value = 'Política de seguridad'
    reason.dispatchEvent(new Event('input'))
    await nextTick()
    dialogButton('Exigir a todo el personal').click()
    await flushPromises()

    expect(bodyText()).toContain('activa tu propia verificación en dos pasos')
    expect(w.text()).toContain('Hoy es opcional')
    w.unmount()
  })

  it('does not let someone without the permission change it', async () => {
    const w = await mountCard({}, { permissions: [] })
    expect(w.find('input[type=checkbox]').attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Solo un superadmin puede cambiar este ajuste.')
    w.unmount()
  })
})
