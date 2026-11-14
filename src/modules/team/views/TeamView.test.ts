import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { bodyText, mountUi } from '@/test/mount'
import { useCurrentUserStore } from '@/store/currentUser'
import type { Member } from '../types'
import TeamView from './TeamView.vue'

const api = vi.hoisted(() => ({
  listTeam: vi.fn(), inviteMember: vi.fn(), resendInvitation: vi.fn(), revokeInvitation: vi.fn(), suspendMember: vi.fn(),
  reactivateMember: vi.fn(), changeRole: vi.fn(), removeMember: vi.fn(), resetTwoFactor: vi.fn(),
}))
vi.mock('../services/teamApi', () => api)

const D = 86_400_000
const at = (offset: number) => new Date(Date.now() + offset).toISOString()
const base = (over: Partial<Member>): Member => ({ id: 0, name: '', email: '', role: 'support', status: 'active', lastLoginAt: null, twoFactorEnabled: false, invitation: null, ...over })

const team = (): Member[] => [
  base({ id: 1, name: 'Admin Quinvite', email: 'admin@cwm.test', role: 'superadmin', lastLoginAt: at(-60_000), twoFactorEnabled: true }),
  base({ id: 2, name: 'Ana Soporte', email: 'ana@cwm.test', lastLoginAt: at(-3 * D - 1000), twoFactorEnabled: true }),
  base({ id: 1_000_000_004, name: 'Carlos Ruiz', email: 'carlos@cwm.test', status: 'invited', invitation: { sentAt: at(-D), expiresAt: at(2 * D + 60_000), resendCount: 0, expired: false } }),
  base({ id: 1_000_000_005, name: 'Diana Pérez', email: 'diana@cwm.test', role: 'superadmin', status: 'invited', invitation: { sentAt: at(-5 * D), expiresAt: at(-2 * D), resendCount: 1, expired: true } }),
  base({ id: 6, name: 'Elena Gómez', email: 'elena@cwm.test', status: 'suspended', lastLoginAt: at(-20 * D) }),
]

const mountView = async (list: Member[] | Error = team()) => {
  const pinia = createPinia()
  setActivePinia(pinia)
  useCurrentUserStore().user = { id: 1, email: 'admin@cwm.test', permissions: ['admin.team.manage'] } as never
  if (list instanceof Error) api.listTeam.mockRejectedValue(list)
  else api.listTeam.mockResolvedValue(list)
  const w = mountUi(TeamView, { global: { plugins: [pinia] } })
  await flushPromises()
  return w
}

const row = (id: number) => document.body.querySelector<HTMLElement>(`[data-member="${id}"]`)!
const menuButton = (name: string) => document.body.querySelector<HTMLButtonElement>(`button[aria-label="Acciones de ${name}"]`)!
const menuItem = (label: string) => Array.from(document.body.querySelectorAll<HTMLElement>('.v-overlay--active .v-list-item')).find(i => i.textContent?.includes(label))
const dialogButton = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.v-card-actions button')).find(b => b.textContent?.includes(label))!
const typeInto = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => { el.value = value; el.dispatchEvent(new Event('input')); await nextTick() }
const openMenu = async (name: string) => { menuButton(name).click(); await flushPromises(); await nextTick() }

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()) })
afterEach(() => { document.body.innerHTML = '' })

describe('TeamView', () => {
  it('lists the team with a status chip, expiry, two-factor and last access', async () => {
    const w = await mountView()
    expect(row(1).textContent).toContain('Tú')
    expect(row(1).textContent).toContain('Activo')
    expect(row(1).textContent).toContain('Superadmin')
    expect(row(2).textContent).toContain('hace 3 días')
    expect(row(2).textContent).toContain('Sí')
    expect(row(1_000_000_004).textContent).toContain('Invitado')
    expect(row(1_000_000_004).textContent).toContain('vence en 2 días')
    expect(row(1_000_000_004).textContent).toContain('Nunca ha entrado')
    expect(row(1_000_000_005).textContent).toContain('Vencida')
    expect(row(6).textContent).toContain('Suspendido')
    w.unmount()
  })

  it('shows a skeleton while it loads the first time', async () => {
    api.listTeam.mockReturnValue(new Promise(() => {}))
    const pinia = createPinia(); setActivePinia(pinia)
    const w = mountUi(TeamView, { global: { plugins: [pinia] } })
    await nextTick()
    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Todavía no hay nadie')
    w.unmount()
  })

  it('says it could not load and retries', async () => {
    const w = await mountView(new Error('boom'))
    expect(w.text()).toContain('No pudimos cargar el equipo.')
    api.listTeam.mockResolvedValue(team())
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('No pudimos cargar el equipo.')
    expect(row(2)).toBeTruthy()
    w.unmount()
  })

  it('has an empty state that invites the first person', async () => {
    const w = await mountView([])
    expect(w.text()).toContain('Todavía no hay nadie en el equipo.')
    w.unmount()
  })

  it('filters by status and by search, and can clear the filters', async () => {
    const w = await mountView()
    const search = w.find('input[type="text"]')
    await typeInto(search.element as HTMLInputElement, 'elena')
    expect(row(6)).toBeTruthy()
    expect(row(2)).toBeNull()
    await typeInto(search.element as HTMLInputElement, 'nadie-se-llama-asi')
    expect(w.text()).toContain('Nadie coincide con esos filtros.')
    await w.findAll('button').find(b => b.text() === 'Quitar filtros' && b.classes().includes('touch') && b.element.closest('.empty'))!.trigger('click')
    expect(row(2)).toBeTruthy()
    w.unmount()
  })

  it('offers resend and revoke on an invitation, and only those', async () => {
    const w = await mountView()
    await openMenu('Carlos Ruiz')
    expect(menuItem('Reenviar invitación')).toBeTruthy()
    expect(menuItem('Revocar invitación')).toBeTruthy()
    expect(menuItem('Suspender')).toBeUndefined()
    w.unmount()
  })

  it('resends right away and says when the new link expires', async () => {
    api.resendInvitation.mockResolvedValue({ ...team()[2], invitation: { sentAt: at(0), expiresAt: at(3 * D - 5000), resendCount: 1, expired: false } })
    const w = await mountView()
    await openMenu('Carlos Ruiz')
    menuItem('Reenviar invitación')!.click()
    await flushPromises()
    expect(api.resendInvitation).toHaveBeenCalledWith(1_000_000_004)
    expect(w.text()).toContain('Reenviamos la invitación a carlos@cwm.test. Vence en 3 días.')
    w.unmount()
  })

  it('explains resend_limit without a dialog', async () => {
    api.resendInvitation.mockRejectedValue({ response: { status: 422, data: { errors: { user: ['resend_limit'] } } } })
    const w = await mountView()
    await openMenu('Diana Pérez')
    menuItem('Reenviar invitación')!.click()
    await flushPromises()
    expect(w.text()).toContain('máximo de veces')
    w.unmount()
  })

  it('revokes with a reason of at least 5 characters', async () => {
    api.revokeInvitation.mockResolvedValue(undefined)
    const w = await mountView()
    await openMenu('Carlos Ruiz')
    menuItem('Revocar invitación')!.click()
    await flushPromises()
    await typeInto(document.body.querySelector('textarea')!, 'ab')
    dialogButton('Revocar').click(); await nextTick()
    expect(api.revokeInvitation).not.toHaveBeenCalled()
    await typeInto(document.body.querySelector('textarea')!, 'Se equivocó de correo')
    dialogButton('Revocar').click()
    await flushPromises()
    expect(api.revokeInvitation).toHaveBeenCalledWith(1_000_000_004, 'Se equivocó de correo')
    expect(w.text()).toContain('Revocamos la invitación de carlos@cwm.test.')
    expect(api.listTeam).toHaveBeenCalledTimes(2)
    w.unmount()
  })

  it('suspends an active member', async () => {
    api.suspendMember.mockResolvedValue({})
    const w = await mountView()
    await openMenu('Ana Soporte')
    expect(menuItem('Reiniciar dos pasos')).toBeTruthy()
    menuItem('Suspender')!.click()
    await flushPromises()
    await typeInto(document.body.querySelector('textarea')!, 'Se fue de vacaciones')
    dialogButton('Suspender').click()
    await flushPromises()
    expect(api.suspendMember).toHaveBeenCalledWith(2, 'Se fue de vacaciones')
    expect(w.text()).toContain('Suspendimos a Ana Soporte.')
    w.unmount()
  })

  it('offers reactivate (not suspend) on a suspended member', async () => {
    const w = await mountView()
    await openMenu('Elena Gómez')
    expect(menuItem('Reactivar')).toBeTruthy()
    expect(menuItem('Suspender')).toBeUndefined()
    w.unmount()
  })

  it('disables every action on your own row and says why', async () => {
    const w = await mountView()
    await openMenu('Admin Quinvite')
    const item = menuItem('Cambiar rol')!
    expect(item.classList.contains('v-list-item--disabled')).toBe(true)
    expect(item.textContent).toContain('No puedes hacerlo sobre tu propia cuenta.')
    w.unmount()
  })

  it('shows the API message when the action fails, keeping the dialog open', async () => {
    api.removeMember.mockRejectedValue({ response: { status: 422, data: { errors: { user: ['last_superadmin'] } } } })
    const w = await mountView()
    await openMenu('Ana Soporte')
    menuItem('Quitar del equipo')!.click()
    await flushPromises()
    await typeInto(document.body.querySelector('textarea')!, 'Ya no trabaja aquí')
    dialogButton('Quitar del equipo').click()
    await flushPromises()
    expect(bodyText()).toContain('única persona superadmin activa')
    expect(document.body.querySelector('.v-dialog')).toBeTruthy()
    w.unmount()
  })

  it('when the person is already gone, says so, closes the dialog and reloads', async () => {
    api.suspendMember.mockRejectedValue({ response: { status: 404, data: { code: 'member_not_found' } } })
    const w = await mountView()
    await openMenu('Ana Soporte')
    menuItem('Suspender')!.click()
    await flushPromises()
    await typeInto(document.body.querySelector('textarea')!, 'Motivo de prueba')
    dialogButton('Suspender').click()
    await flushPromises()
    expect(w.text()).toContain('Esta persona ya no está en la lista.')
    expect(api.listTeam).toHaveBeenCalledTimes(2)
    w.unmount()
  })

  it('invites a person: needs a valid email and a reason, and reports the result', async () => {
    api.inviteMember.mockResolvedValue({ ...team()[2], email: 'nueva@cwm.test' })
    const w = await mountView()
    await w.findAll('button').find(b => b.text().includes('Invitar a una persona'))!.trigger('click')
    await flushPromises()
    expect(bodyText()).toContain('Soporte')
    expect(bodyText()).toContain('suplanta cuentas')
    expect(dialogButton('Enviar invitación').disabled).toBe(true)
    await typeInto(document.body.querySelector('input[type="email"]')!, 'nueva@cwm.test')
    await typeInto(document.body.querySelector('textarea')!, 'Entra al equipo de soporte')
    dialogButton('Enviar invitación').click()
    await flushPromises()
    expect(api.inviteMember).toHaveBeenCalledWith({ email: 'nueva@cwm.test', name: undefined, role: 'support', reason: 'Entra al equipo de soporte' })
    expect(w.text()).toContain('Enviamos la invitación a nueva@cwm.test.')
    w.unmount()
  })

  it('shows invitation_pending in the dialog', async () => {
    api.inviteMember.mockRejectedValue({ response: { status: 422, data: { errors: { email: ['invitation_pending'] } } } })
    const w = await mountView()
    await w.findAll('button').find(b => b.text().includes('Invitar a una persona'))!.trigger('click')
    await flushPromises()
    await typeInto(document.body.querySelector('input[type="email"]')!, 'carlos@cwm.test')
    await typeInto(document.body.querySelector('textarea')!, 'Reintento de invitación')
    dialogButton('Enviar invitación').click()
    await flushPromises()
    expect(bodyText()).toContain('Ya hay una invitación pendiente')
    w.unmount()
  })

  it('no longer has a temporary password flow', async () => {
    const w = await mountView()
    expect(bodyText()).not.toContain('contraseña temporal')
    w.unmount()
  })
})
