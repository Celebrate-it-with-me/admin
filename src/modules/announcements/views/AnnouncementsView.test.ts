import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { bodyText, mountUi } from '@/test/mount'
import type { Announcement } from '../types'
import AnnouncementsView from './AnnouncementsView.vue'

const api = vi.hoisted(() => ({ listAnnouncements: vi.fn(), deleteAnnouncement: vi.fn(), createAnnouncement: vi.fn(), updateAnnouncement: vi.fn(), previewAudience: vi.fn() }))
vi.mock('../services/announcementsApi', () => api)

const ann = (id: number, over: Partial<Announcement> = {}): Announcement => ({
  id, level: 'info', titleEs: `Anuncio ${id}`, titleEn: `Announcement ${id}`, bodyEs: 'Cuerpo', bodyEn: 'Body', ctaLabelEs: null, ctaLabelEn: null, ctaUrl: null, dismissible: true,
  audience: 'all', upcomingDays: null, startsAt: '2027-03-10T14:00:00.000Z', endsAt: null, isActive: true, status: 'active', dismissedCount: 4, createdAt: '', updatedAt: '', ...over,
})
const list = (items: Announcement[], total = items.length) => ({ items, meta: { page: 1, perPage: 10, total } })
const SAMPLE = [
  ann(1, { level: 'warning', status: 'active', dismissible: false }),
  ann(2, { level: 'news', status: 'scheduled', audience: 'upcoming_event', upcomingDays: 30 }),
  ann(3, { status: 'ended', endsAt: '2027-03-20T14:00:00.000Z' }),
  ann(4, { status: 'inactive', isActive: false, audience: 'free' }),
]

const mountView = async (result: unknown = list(SAMPLE)) => {
  if (result instanceof Error) api.listAnnouncements.mockRejectedValue(result)
  else api.listAnnouncements.mockResolvedValue(result)
  const w = mountUi(AnnouncementsView)
  await flushPromises()
  return w
}
const row = (id: number) => document.body.querySelector<HTMLElement>(`[data-announcement="${id}"]`)!
const button = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === label)!
const byLabel = (label: string) => document.body.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()); api.previewAudience.mockResolvedValue(1) })
afterEach(() => { document.body.innerHTML = '' })

describe('AnnouncementsView', () => {
  it('lists announcements with status chip (text + icon), level, audience and closes', async () => {
    const w = await mountView()
    expect(api.listAnnouncements).toHaveBeenCalledWith({ status: null, page: 1, perPage: 10 })
    expect(row(1).textContent).toContain('Activo')
    expect(row(1).textContent).toContain('Aviso')
    expect(row(1).textContent).toContain('No se puede cerrar')
    expect(row(2).textContent).toContain('Programado')
    expect(row(2).textContent).toContain('30 días')
    expect(row(3).textContent).toContain('Terminado')
    expect(row(4).textContent).toContain('Inactivo')
    expect(row(4).textContent).toContain('Plan gratis')
    expect(row(1).querySelector('[data-status="active"] .mdi-check-circle-outline')).not.toBeNull()
    expect(row(3).textContent).toContain('4')
    w.unmount()
  })

  it('shows a skeleton while it loads', async () => {
    api.listAnnouncements.mockReturnValue(new Promise(() => {}))
    const w = mountUi(AnnouncementsView)
    await nextTick()
    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    w.unmount()
  })

  it('says it could not load and retries', async () => {
    const w = await mountView(new Error('boom'))
    expect(w.text()).toContain('No pudimos cargar los anuncios.')
    api.listAnnouncements.mockResolvedValue(list(SAMPLE))
    await w.findAll('button').find(b => b.text() === 'Reintentar')!.trigger('click')
    await flushPromises()
    expect(w.text()).not.toContain('No pudimos cargar')
    expect(row(1)).toBeTruthy()
    w.unmount()
  })

  it('has an empty state, with and without filter', async () => {
    const w = await mountView(list([]))
    expect(w.text()).toContain('Todavía no hay anuncios.')
    document.body.querySelector<HTMLElement>('[data-filter="ended"]')!.click()
    await flushPromises()
    expect(api.listAnnouncements).toHaveBeenLastCalledWith({ status: 'ended', page: 1, perPage: 10 })
    expect(w.text()).toContain('No hay anuncios con ese estado.')
    w.unmount()
  })

  it('filters by status through the API', async () => {
    const w = await mountView()
    document.body.querySelector<HTMLElement>('[data-filter="scheduled"]')!.click()
    await flushPromises()
    expect(api.listAnnouncements).toHaveBeenLastCalledWith({ status: 'scheduled', page: 1, perPage: 10 })
    w.unmount()
  })

  it('paginates', async () => {
    const w = await mountView(list(SAMPLE, 25))
    expect(document.body.querySelector('.v-pagination')).not.toBeNull()
    const next = document.body.querySelector<HTMLButtonElement>('.v-pagination button[aria-label*="iguiente"], .v-pagination__next button')!
    next.click(); await flushPromises()
    expect(api.listAnnouncements).toHaveBeenLastCalledWith({ status: null, page: 2, perPage: 10 })
    w.unmount()
  })

  it('does not paginate a single page', async () => {
    const w = await mountView()
    expect(document.body.querySelector('.v-pagination')).toBeNull()
    w.unmount()
  })

  it('deletes with a reason of at least 5 characters', async () => {
    api.deleteAnnouncement.mockResolvedValue(undefined)
    const w = await mountView()
    byLabel('Borrar «Anuncio 3»').click(); await flushPromises()
    expect(bodyText()).toContain('Borrar el anuncio')
    const area = document.body.querySelector<HTMLTextAreaElement>('.v-dialog textarea')!
    area.value = 'no'; area.dispatchEvent(new Event('input')); await nextTick()
    button('Borrar').click(); await flushPromises()
    expect(api.deleteAnnouncement).not.toHaveBeenCalled()
    area.value = 'Ya no aplica'; area.dispatchEvent(new Event('input')); await nextTick()
    button('Borrar').click(); await flushPromises()
    expect(api.deleteAnnouncement).toHaveBeenCalledWith(3, 'Ya no aplica')
    expect(bodyText()).toContain('Borramos el anuncio «Anuncio 3»')
    w.unmount()
  })

  it('says so and refreshes when the announcement to delete is already gone (404)', async () => {
    api.deleteAnnouncement.mockRejectedValue({ response: { status: 404, data: { code: 'announcement_not_found' } } })
    const w = await mountView()
    byLabel('Borrar «Anuncio 3»').click(); await flushPromises()
    const area = document.body.querySelector<HTMLTextAreaElement>('.v-dialog textarea')!
    area.value = 'Ya no aplica'; area.dispatchEvent(new Event('input')); await nextTick()
    button('Borrar').click(); await flushPromises()
    expect(bodyText()).toContain('ya no existe')
    expect(api.listAnnouncements).toHaveBeenCalledTimes(2)
    w.unmount()
  })

  it('opens the form to create and to edit', async () => {
    const w = await mountView()
    button('Nuevo anuncio').click(); await flushPromises()
    expect(bodyText()).toContain('Crear anuncio')
    document.body.querySelector<HTMLButtonElement>('button[aria-label="Cerrar"]')!.click(); await flushPromises()
    byLabel('Editar «Anuncio 2»').click(); await flushPromises()
    expect(bodyText()).toContain('Editar anuncio')
    const input = document.body.querySelector<HTMLInputElement>('input[value="Anuncio 2"]')
    expect(input).not.toBeNull()
    w.unmount()
  })
})
