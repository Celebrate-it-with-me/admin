import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mountUi } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import TheLoginForm from './TheLoginForm.vue'

const nav = vi.hoisted(() => ({ query: {} as Record<string, string>, push: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: nav.query }), useRouter: () => ({ push: nav.push }) }))
vi.mock('@/services/axios', () => ({ API: { defaults: { headers: { common: {} } }, get: vi.fn(), post: vi.fn() } }))

const mountForm = async (login: unknown) => {
  const pinia = createPinia(); setActivePinia(pinia)
  const store = useCurrentUserStore()
  store.login = vi.fn().mockResolvedValue(login) as never
  const w = mountUi(TheLoginForm, { global: { plugins: [pinia] } })
  const inputs = w.findAll('input')
  ;(inputs[0].element as HTMLInputElement).value = 'a@cwm.test'; await inputs[0].trigger('input')
  ;(inputs[1].element as HTMLInputElement).value = 'secret'; await inputs[1].trigger('input')
  await w.find('form').trigger('submit')
  await flushPromises()
  return w
}

beforeEach(() => { nav.query = {}; nav.push.mockReset() })
afterEach(() => { document.body.innerHTML = '' })

describe('TheLoginForm', () => {
  it('says how long to wait on 429 using Retry-After', async () => {
    const w = await mountForm({ status: 429, response: { status: 429, headers: { 'retry-after': '300' } } })
    expect(w.text()).toContain('Espera 5 minutos')
  })

  it('falls back to a generic wait without Retry-After', async () => {
    const w = await mountForm({ status: 429, response: { status: 429, headers: {} } })
    expect(w.text()).toContain('Espera unos minutos')
  })

  it('explains the redirect after admin_session_required', async () => {
    nav.query = { expired: 'login' }
    const w = await mountForm({ status: 422 })
    expect(w.text()).toContain('El correo o la contraseña no coinciden.')
    expect(w.text()).toContain('Necesitas entrar con tu cuenta del panel')
  })

  it('keeps the expired-session notice for session_expired', async () => {
    nav.query = { expired: '1' }
    const w = await mountForm({ status: 422 })
    expect(w.text()).toContain('Tu sesión venció por seguridad')
  })
})
