import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi, bodyText } from '@/test/mount'
import UserFormDialog from './UserFormDialog.vue'

const http = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))

const mountOpen = async () => {
  const w = mountUi(UserFormDialog, { props: { modelValue: false } })
  await w.setProps({ modelValue: true })
  await flushPromises()
  return w
}
const type = async (label: string, value: string) => {
  const field = Array.from(document.querySelectorAll('.v-field')).find(f => f.textContent?.includes(label))!
  const input = field.querySelector('input') as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input'))
  await flushPromises()
}
const submit = async () => {
  ;(document.querySelector('button[type="submit"]') as HTMLButtonElement).click()
  await flushPromises()
}

beforeEach(() => { http.post.mockReset(); http.put.mockReset() })
afterEach(() => { document.body.innerHTML = '' })

describe('UserFormDialog (create only)', () => {
  it('asks for 12+ characters and does not call the API with a shorter password', async () => {
    await mountOpen()
    await type('Nombre', 'Ana'); await type('Correo', 'ana@cwm.test'); await type('Contraseña', '12345678901')
    await submit()
    expect(http.post).not.toHaveBeenCalled()
    expect(bodyText()).toContain('Mínimo 12 caracteres.')
  })

  it('creates with POST users and never uses PUT', async () => {
    http.post.mockResolvedValue({})
    const w = await mountOpen()
    await type('Nombre', 'Ana'); await type('Correo', 'ana@cwm.test'); await type('Contraseña', '123456789012')
    await submit()
    expect(http.post).toHaveBeenCalledWith('users', { name: 'Ana', email: 'ana@cwm.test', password: '123456789012' })
    expect(http.put).not.toHaveBeenCalled()
    expect(w.emitted('saved')).toBeTruthy()
  })

  it('shows a 422 under its own field', async () => {
    http.post.mockRejectedValue({ response: { status: 422, data: { errors: { email: ['Ese correo ya está en uso.'] } } } })
    await mountOpen()
    await type('Nombre', 'Ana'); await type('Correo', 'ana@cwm.test'); await type('Contraseña', '123456789012')
    await submit()
    expect(bodyText()).toContain('Ese correo ya está en uso.')
  })
})
