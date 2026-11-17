import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi } from '@/test/mount'
import UserDetailView from './UserDetailView.vue'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '7' } }) }))
vi.mock('@/store/currentUser', () => ({ useCurrentUserStore: () => ({ can: () => false }) }))

const profile = (extra: Record<string, unknown> = {}) => ({
  id: 7, name: 'Ana Pérez', email: 'ana@cwm.test', phone: null, avatarUrl: null, emailVerified: true,
  staffRoles: [], createdAt: null, anonymizedAt: null, suspension: null, events: [],
  purchases: { paidCount: 0, paidTotalCents: 0, refundedCount: 0, currency: 'USD' }, recentSessions: [],
  ...extra,
})

const render = async (extra?: Record<string, unknown>) => {
  http.get.mockResolvedValue({ data: { data: profile(extra) } })
  const w = mountUi(UserDetailView, { global: { stubs: { RouterLink: true, ImpersonateButton: true, DeleteUserDialog: true, ReasonDialog: true } } })
  await flushPromises()
  return w
}
const chips = (w: Awaited<ReturnType<typeof render>>) => w.findAll('[data-test="signin-chip"]').map(c => c.text())
const HINT = 'No tiene contraseña'

beforeEach(() => { http.get.mockReset() })

describe('UserDetailView sign-in methods', () => {
  it('password only: shows Contraseña and no help note', async () => {
    const w = await render({ signInMethods: ['password'] })
    expect(chips(w)).toEqual(['Contraseña'])
    expect(w.text()).toContain('Entra con:')
    expect(w.text()).not.toContain(HINT)
  })

  it('social only: shows providers and the help note', async () => {
    const w = await render({ signInMethods: ['google', 'facebook'] })
    expect(chips(w)).toEqual(['Google', 'Facebook'])
    expect(w.text()).toContain(HINT)
    expect(w.text()).toContain('«Olvidé mi contraseña»')
  })

  it('mixed: shows all and no help note', async () => {
    const w = await render({ signInMethods: ['password', 'google'] })
    expect(chips(w)).toEqual(['Contraseña', 'Google'])
    expect(w.text()).not.toContain(HINT)
  })

  it('missing or empty field: shows nothing and does not break', async () => {
    for (const extra of [{}, { signInMethods: [] }, { signInMethods: null }]) {
      const w = await render(extra)
      expect(w.find('[data-test="signin"]').exists()).toBe(false)
      expect(w.text()).not.toContain('Entra con')
      expect(w.text()).not.toContain(HINT)
      expect(w.text()).toContain('Ana Pérez')
    }
  })
})
