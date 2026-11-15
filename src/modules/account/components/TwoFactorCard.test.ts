import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi, bodyText } from '@/test/mount'
import TwoFactorCard from './TwoFactorCard.vue'

const api = vi.hoisted(() => ({ disableTwoFactor: vi.fn(), regenerateRecoveryCodes: vi.fn() }))
vi.mock('../services/accountApi', () => api)

const status = { enabled: true, confirmedAt: '2026-11-01T10:00:00Z', recoveryCodesRemaining: 6, required: false }
const stubs = { TwoFactorSetupDialog: true }

const input = (label: string) => Array.from(document.body.querySelectorAll<HTMLInputElement>('.v-dialog input')).find(i => i.closest('.v-input')?.textContent?.includes(label))!
const btn = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.v-dialog button')).find(b => b.textContent?.trim() === label)!
const type = async (el: HTMLInputElement, value: string) => { el.value = value; el.dispatchEvent(new Event('input')); await flushPromises() }

const openDialog = async () => {
  const w = mountUi(TwoFactorCard, { props: { status, email: 'a@cwm.test' }, global: { stubs } })
  await w.findAll('button').find(b => b.text().includes('Desactivar'))!.trigger('click')
  await flushPromises()
  return w
}
const submit = async () => { btn('Desactivar').closest('form')!.dispatchEvent(new Event('submit')); await flushPromises() }

beforeEach(() => { api.disableTwoFactor.mockReset() })
afterEach(() => { document.body.innerHTML = '' })

describe('TwoFactorCard: disabling', () => {
  it('shows the code field with its help text', async () => {
    const w = await openDialog()
    expect(bodyText()).toContain('Código')
    expect(bodyText()).toContain('Código de tu app autenticadora o un código de recuperación')
    w.unmount()
  })

  it('does not call the API with an empty code', async () => {
    const w = await openDialog()
    await type(input('Tu contraseña actual'), 'secret-pass')
    await submit()
    expect(api.disableTwoFactor).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Escribe el código.')
    w.unmount()
  })

  it('sends password and code, then reports the change', async () => {
    api.disableTwoFactor.mockResolvedValue({ ...status, enabled: false })
    const w = await openDialog()
    await type(input('Tu contraseña actual'), 'secret-pass')
    await type(input('Código'), ' 123456 ')
    await submit()
    expect(api.disableTwoFactor).toHaveBeenCalledWith('secret-pass', '123456')
    expect(w.emitted('changed')).toBeTruthy()
    w.unmount()
  })

  it('shows invalid_code next to the field', async () => {
    api.disableTwoFactor.mockRejectedValue({ response: { status: 422, data: { errors: { code: ['invalid_code'] } } } })
    const w = await openDialog()
    await type(input('Tu contraseña actual'), 'secret-pass')
    await type(input('Código'), '000000')
    await submit()
    expect(bodyText()).toContain('Ese código no es correcto')
    expect(w.emitted('changed')).toBeFalsy()
    w.unmount()
  })

  it('shows required next to the field when the API says so', async () => {
    api.disableTwoFactor.mockRejectedValue({ response: { status: 422, data: { errors: { code: ['required'] } } } })
    const w = await openDialog()
    await type(input('Tu contraseña actual'), 'secret-pass')
    await type(input('Código'), '1')
    await submit()
    expect(bodyText()).toContain('Escribe el código.')
    w.unmount()
  })

  it('shows the too-many-attempts message on 429', async () => {
    api.disableTwoFactor.mockRejectedValue({ response: { status: 429, data: { code: 'too_many_attempts' } } })
    const w = await openDialog()
    await type(input('Tu contraseña actual'), 'secret-pass')
    await type(input('Código'), '123456')
    await submit()
    expect(bodyText()).toContain('Demasiados intentos')
    w.unmount()
  })
})
