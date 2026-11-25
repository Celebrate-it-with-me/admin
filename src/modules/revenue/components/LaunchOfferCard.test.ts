import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { bodyText, mountUi } from '@/test/mount'
import type { LaunchOffer } from '../types'
import LaunchOfferCard from './LaunchOfferCard.vue'

const api = vi.hoisted(() => ({ fetchLaunchOffer: vi.fn(), updateLaunchOffer: vi.fn() }))
vi.mock('../services/revenueApi', () => api)

const offer = (over: Partial<LaunchOffer> = {}): LaunchOffer => ({
  id: 1, isActive: true, active: true, priceCents: 7900, listPriceCents: 9900, currency: 'USD',
  totalSlots: 100, slotsUsed: 30, slotsPaid: 28, slotsAdjustment: 2, slotsHeld: 3, slotsLeft: 67, ...over,
})
const result = (over = {}) => ({ ...offer(), sessionsClosed: 0, sessionsStillOpen: 0, ...over })
const mountCard = async (o: LaunchOffer | null | Error = offer()) => {
  if (o instanceof Error) api.fetchLaunchOffer.mockRejectedValue(o)
  else api.fetchLaunchOffer.mockResolvedValue(o)
  const w = mountUi(LaunchOfferCard, { props: { listPriceCents: 9900, currency: 'USD' } })
  await flushPromises()
  return w
}
const button = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).filter(b => b.textContent?.trim() === label).at(-1)!
const type = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => { el.value = value; el.dispatchEvent(new Event('input')); await flushPromises() }
const field = (label: string) => Array.from(document.body.querySelectorAll('.v-input')).find(f => f.querySelector('.v-label')?.textContent?.trim() === label)!.querySelector<HTMLInputElement>('input')!
const reason = async (text: string) => type(document.body.querySelector<HTMLTextAreaElement>('textarea')!, text)

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()) })
afterEach(() => { document.body.innerHTML = '' })

describe('LaunchOfferCard', () => {
  it('shows the active offer with its numbers', async () => {
    const w = await mountCard()
    expect(w.get('[data-testid="offer-state"]').text()).toContain('Activa')
    expect(w.text()).toContain('$79')
    expect(w.get('[data-testid="slots-total"]').text()).toBe('100')
    expect(w.get('[data-testid="slots-used"]').text()).toBe('30')
    expect(w.get('[data-testid="slots-held"]').text()).toBe('3')
    expect(w.get('[data-testid="slots-left"]').text()).toBe('67')
    expect(w.text()).toContain('+2 ajuste')
    expect(w.get('[data-testid="offer-shared"]').text()).toContain('LANZAMIENTO79')
    expect(w.get('[data-testid="offer-state"]').classes()).toContain('offer-chip--active')
  })

  it('shows sold out and inactive states', async () => {
    let w = await mountCard(offer({ active: false, slotsLeft: 0, slotsUsed: 100, slotsAdjustment: 0 }))
    expect(w.get('[data-testid="offer-state"]').text()).toContain('Agotada')
    expect(w.text()).toContain('Se agotaron los cupos')
    w.unmount()
    w = await mountCard(offer({ isActive: false, active: false }))
    expect(w.get('[data-testid="offer-state"]').text()).toContain('Inactiva')
    expect(w.get('[data-testid="offer-state"]').classes()).toContain('offer-chip--inactive')
  })

  it('offers to create when there is no offer, and sends price and total', async () => {
    const w = await mountCard(null)
    expect(w.find('[data-testid="offer-empty"]').exists()).toBe(true)
    await w.findAll('button').find(b => b.text() === 'Crear oferta')!.trigger('click')
    await flushPromises()
    await button('Guardar').click()
    await flushPromises()
    expect(api.updateLaunchOffer).not.toHaveBeenCalled()
    await type(field('Precio de la oferta'), '79')
    await type(field('Tope de cupos'), '100')
    await reason('Primera oferta')
    api.updateLaunchOffer.mockResolvedValue(result())
    api.fetchLaunchOffer.mockResolvedValue(offer())
    await button('Guardar').click()
    await flushPromises()
    expect(api.updateLaunchOffer).toHaveBeenCalledWith({ priceCents: 7900, totalSlots: 100 }, 'Primera oferta')
    expect(w.emitted('notice')![0]).toEqual(['Oferta creada.'])
  })

  it('deactivates after confirming with a reason, and reports closed checkouts', async () => {
    const w = await mountCard()
    await w.findAll('button').find(b => b.text() === 'Desactivar')!.trigger('click')
    await flushPromises()
    expect(bodyText()).toContain('Los pagos que ahora están abiertos')
    await button('Desactivar').click()
    await flushPromises()
    expect(api.updateLaunchOffer).not.toHaveBeenCalled()
    await reason('Pausa por revisión')
    api.updateLaunchOffer.mockResolvedValue(result({ isActive: false, sessionsClosed: 2 }))
    await button('Desactivar').click()
    await flushPromises()
    expect(api.updateLaunchOffer).toHaveBeenCalledWith({ isActive: false }, 'Pausa por revisión')
    expect(w.emitted('notice')![0][0]).toContain('Se cerraron 2 pagos en curso')
  })

  it('activates an inactive offer', async () => {
    const w = await mountCard(offer({ isActive: false, active: false }))
    await w.findAll('button').find(b => b.text() === 'Activar')!.trigger('click')
    await flushPromises()
    expect(bodyText()).toContain('Vas a activar un precio real')
    expect(bodyText()).toContain('en lugar de $99')
    expect(w.findAll('button').find(b => b.text() === 'Activar')!.classes()).toContain('v-btn--variant-tonal')
    await reason('Lanzamiento')
    api.updateLaunchOffer.mockResolvedValue(result())
    await button('Activar').click()
    await flushPromises()
    expect(api.updateLaunchOffer).toHaveBeenCalledWith({ isActive: true }, 'Lanzamiento')
    expect(w.emitted('notice')![0]).toEqual(['Oferta activada.'])
  })

  it('shows a cancelled reauth and keeps the dialog open', async () => {
    const w = await mountCard()
    await w.findAll('button').find(b => b.text() === 'Desactivar')!.trigger('click')
    await flushPromises()
    await reason('Pausa por revisión')
    api.updateLaunchOffer.mockRejectedValue({ reauthCancelled: true })
    await button('Desactivar').click()
    await flushPromises()
    expect(bodyText()).toContain('No se confirmó tu contraseña')
    expect(w.emitted('notice')).toBeUndefined()
  })

  it('adjusts price and used slots, showing server errors', async () => {
    const w = await mountCard()
    await w.findAll('button').find(b => b.text() === 'Ajustar')!.trigger('click')
    await flushPromises()
    await reason('Sin cambios')
    await button('Guardar').click()
    await flushPromises()
    expect(bodyText()).toContain('No hay cambios')
    await type(field('Precio de la oferta'), '99')
    await button('Guardar').click()
    await flushPromises()
    expect(bodyText()).toContain('menor que el precio normal')
    await type(field('Precio de la oferta'), '69')
    await type(field('Cupos usados'), '35')
    await reason('Venta por Zelle')
    api.updateLaunchOffer.mockRejectedValueOnce({ response: { status: 422, data: { errors: { slotsUsed: ['below_paid_purchases'] } } } })
    await button('Guardar').click()
    await flushPromises()
    expect(api.updateLaunchOffer).toHaveBeenCalledWith({ priceCents: 6900, slotsUsed: 35 }, 'Venta por Zelle')
    expect(bodyText()).toContain('no pueden ser menos que las compras ya pagadas')
    api.updateLaunchOffer.mockResolvedValue(result({ priceCents: 6900, sessionsStillOpen: 1 }))
    await button('Guardar').click()
    await flushPromises()
    expect(w.emitted('notice')![0][0]).toContain('sigue abierto')
  })

  it('asks to allow a total under the used slots', async () => {
    await mountCard()
    document.body.querySelectorAll<HTMLButtonElement>('button').forEach(b => { if (b.textContent?.trim() === 'Ajustar') b.click() })
    await flushPromises()
    expect(bodyText()).not.toContain('Permitir un tope menor')
    await type(field('Tope de cupos'), '10')
    expect(bodyText()).toContain('Permitir un tope menor')
  })

  it('shows a retry on load failure and a plain message on 403', async () => {
    let w = await mountCard(new Error('net'))
    expect(w.get('[data-testid="offer-error"]').text()).toContain('No pudimos cargar')
    expect(w.text()).toContain('Reintentar')
    w.unmount()
    w = await mountCard(Object.assign(new Error('403'), { response: { status: 403, data: {} } }))
    expect(w.get('[data-testid="offer-error"]').text()).toContain('No tienes permiso')
    expect(w.text()).not.toContain('Reintentar')
  })
})
