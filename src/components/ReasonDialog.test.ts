import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mountUi } from '@/test/mount'
import ReasonDialog from './ReasonDialog.vue'

const textarea = () => document.body.querySelector('textarea') as HTMLTextAreaElement
const buttons = () => Array.from(document.body.querySelectorAll<HTMLButtonElement>('.v-card-actions button'))
const button = (label: string) => buttons().find(b => b.textContent?.includes(label))!
const type = async (text: string) => { textarea().value = text; textarea().dispatchEvent(new Event('input')); await nextTick() }

const open = async (props: Record<string, unknown> = {}, slots: Record<string, string> = {}) => {
  const wrapper = mountUi(ReasonDialog, { props: { modelValue: true, title: 'Archivar evento', ...props }, slots })
  await nextTick(); await nextTick()
  return wrapper
}

afterEach(() => { document.body.innerHTML = '' })

describe('ReasonDialog', () => {
  it('shows the title, the message and the audit hint', async () => {
    const w = await open({ message: 'Se oculta para todos.' })
    expect(document.body.textContent).toContain('Archivar evento')
    expect(document.body.textContent).toContain('Se oculta para todos.')
    expect(document.body.textContent).toContain('Queda registrado en la auditoría.')
    w.unmount()
  })

  it('renders nothing while closed', async () => {
    const w = mountUi(ReasonDialog, { props: { modelValue: false, title: 'Archivar evento' } })
    await nextTick()
    expect(document.body.textContent).not.toContain('Archivar evento')
    w.unmount()
  })

  it('does not confirm a reason shorter than 5 characters and tells why', async () => {
    const w = await open()
    await type('  ab  ')
    button('Confirmar').click(); await nextTick()
    expect(w.emitted('confirm')).toBeUndefined()
    expect(document.body.textContent).toContain('Escribe al menos 5 caracteres.')
    w.unmount()
  })

  it('does not count the padding spaces toward the minimum', async () => {
    const w = await open()
    await type('   abcd      ')
    button('Confirmar').click(); await nextTick()
    expect(w.emitted('confirm')).toBeUndefined()
    w.unmount()
  })

  it('emits the trimmed reason at 5 characters', async () => {
    const w = await open()
    await type('   motivo  ')
    button('Confirmar').click(); await nextTick()
    expect(w.emitted('confirm')).toEqual([['motivo']])
    w.unmount()
  })

  it('closes with Cancelar by asking the parent to update modelValue', async () => {
    const w = await open()
    button('Cancelar').click(); await nextTick()
    expect(w.emitted('update:modelValue')).toEqual([[false]])
    w.unmount()
  })

  it('uses the custom label and the danger colour', async () => {
    const w = await open({ confirmLabel: 'Quitar', danger: true })
    const confirm = button('Quitar')
    expect(confirm).toBeDefined()
    expect(confirm.className).toContain('bg-error')
    w.unmount()
  })

  it('keeps Confirmar off while confirmDisabled, even with a valid reason', async () => {
    const w = await open({ confirmDisabled: true })
    await type('motivo válido')
    expect(button('Confirmar').disabled).toBe(true)
    button('Confirmar').click(); await nextTick()
    expect(w.emitted('confirm')).toBeUndefined()
    w.unmount()
  })

  it('does not confirm twice while loading and disables Cancelar', async () => {
    const w = await open({ loading: true })
    await type('motivo válido')
    expect(button('Cancelar').disabled).toBe(true)
    w.unmount()
  })

  it('shows the server error', async () => {
    const w = await open({ error: 'No se pudo archivar.' })
    expect(document.body.textContent).toContain('No se pudo archivar.')
    w.unmount()
  })

  it('renders extra fields from the default slot', async () => {
    const w = await open({}, { default: '<p class="extra">Campo extra</p>' })
    expect(document.body.querySelector('.extra')?.textContent).toBe('Campo extra')
    w.unmount()
  })

  it('clears the reason when it opens again', async () => {
    const w = await open()
    await type('algo escrito')
    await w.setProps({ modelValue: false }); await nextTick()
    await w.setProps({ modelValue: true }); await nextTick(); await nextTick()
    expect(textarea().value).toBe('')
    w.unmount()
  })
})
