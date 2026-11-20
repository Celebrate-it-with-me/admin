import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi } from '@/test/mount'
import ReasonDialog from '@/components/ReasonDialog.vue'
import UserDetailView from './UserDetailView.vue'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }))
const can = vi.hoisted(() => ({ all: false }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '7' } }) }))
vi.mock('@/store/currentUser', () => ({ useCurrentUserStore: () => ({ can: () => can.all }) }))

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

beforeEach(() => { http.get.mockReset(); http.post.mockReset(); can.all = false })

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

describe('UserDetailView reason-gated actions', () => {
  const dialogs = (w: Awaited<ReturnType<typeof render>>) => w.findAllComponents(ReasonDialog)
  const clickButton = async (w: Awaited<ReturnType<typeof render>>, label: string) => {
    await w.findAll('button').find(b => b.text().includes(label))!.trigger('click')
  }

  it('password reset asks for a reason and sends it', async () => {
    can.all = true
    http.post.mockResolvedValue({ data: {} })
    const w = await render()
    await clickButton(w, 'Restablecer contraseña')
    const dlg = dialogs(w).find(d => d.props('title') === 'Restablecer la contraseña')!
    expect(dlg.props('modelValue')).toBe(true)
    dlg.vm.$emit('confirm', 'Pidió acceso por soporte')
    await flushPromises()
    expect(http.post).toHaveBeenCalledWith('users/7/password-reset', { reason: 'Pidió acceso por soporte' })
    expect(w.text()).toContain('Enviamos el correo')
  })

  it('password reset keeps the dialog open and shows the error', async () => {
    can.all = true
    http.post.mockRejectedValue({ reauthCancelled: true })
    const w = await render()
    await clickButton(w, 'Restablecer contraseña')
    const dlg = dialogs(w).find(d => d.props('title') === 'Restablecer la contraseña')!
    dlg.vm.$emit('confirm', 'motivo válido')
    await flushPromises()
    const after = dialogs(w).find(d => d.props('title') === 'Restablecer la contraseña')!
    expect(after.props('modelValue')).toBe(true)
    expect(after.props('error')).toContain('No se confirmó tu contraseña')
  })

  it('export sends the reason as a query param and downloads the JSON', async () => {
    can.all = true
    http.get.mockImplementation((url: string) => url.endsWith('/export')
      ? Promise.resolve({ data: { user: { id: 7 } }, headers: { 'content-disposition': 'attachment; filename="user-7-export.json"' } })
      : Promise.resolve({ data: { data: profile() } }))
    const create = vi.fn(() => 'blob:x')
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() })
    const w = await render()
    await clickButton(w, 'Exportar datos')
    const dlg = dialogs(w).find(d => d.props('title') === 'Exportar los datos de la cuenta')!
    dlg.vm.$emit('confirm', 'Solicitud de la titular')
    await flushPromises()
    expect(http.get).toHaveBeenCalledWith('users/7/export', { params: { reason: 'Solicitud de la titular' } })
    expect(create).toHaveBeenCalled()
  })

  it('export failure shows the message in the dialog', async () => {
    can.all = true
    const w = await render()
    http.get.mockRejectedValueOnce({ response: { status: 500 } })
    await clickButton(w, 'Exportar datos')
    dialogs(w).find(d => d.props('title') === 'Exportar los datos de la cuenta')!.vm.$emit('confirm', 'motivo válido')
    await flushPromises()
    expect(dialogs(w).find(d => d.props('title') === 'Exportar los datos de la cuenta')!.props('error')).toContain('No pudimos exportar')
  })
})
