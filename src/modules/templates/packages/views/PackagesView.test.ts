import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { mountUi } from '@/test/mount'
import type { PackageSummary } from '../types'
import PackagesView from './PackagesView.vue'

const api = vi.hoisted(() => ({ listPackages: vi.fn() }))
vi.mock('../packagesApi', () => api)
const stubs = { 'router-link': { template: '<a><slot /></a>' }, TemplatesTabs: true }

const row = (id: number, over: Partial<PackageSummary> = {}): PackageSummary => ({
  id, slug: `pkg-${id}`, semver: '1.0.0', level: 1, visibility: 'public', tier: 'premium', status: 'active', name: { es: `Paquete ${id}`, en: `Package ${id}` },
  eventTypes: ['wedding', 'quinceanera'], engineMin: 1, author: null, sizeBytes: 100000, installedAt: '2026-11-14T16:20:00Z', eventsPinned: 3, ...over,
})
const page = (items: PackageSummary[]) => ({ items, meta: { page: 1, perPage: 25, total: items.length } })

beforeEach(() => { api.listPackages.mockReset() })
afterEach(() => { document.body.innerHTML = '' })

describe('PackagesView', () => {
  it('lists packages with status, visibility and pinned events', async () => {
    api.listPackages.mockResolvedValue(page([row(1), row(2, { status: 'installed', visibility: 'private' })]))
    const w = mountUi(PackagesView, { global: { stubs } })
    await flushPromises()
    expect(api.listPackages).toHaveBeenCalledWith({ status: null, visibility: null })
    const r2 = w.find('tr[data-package="2"]')
    expect(r2.text()).toContain('Borrador')
    expect(r2.text()).toContain('Privado')
    expect(w.find('tr[data-package="1"]').text()).toContain('Activo')
    expect(w.find('tr[data-package="1"]').text()).toContain('Boda y Quinceañera')
    w.unmount()
  })

  it('shows a skeleton while loading', async () => {
    api.listPackages.mockReturnValue(new Promise(() => {}))
    const w = mountUi(PackagesView, { global: { stubs } })
    await nextTick()
    expect(w.find('[aria-busy="true"]').exists()).toBe(true)
    w.unmount()
  })

  it('shows the empty state with a way to upload the first one', async () => {
    api.listPackages.mockResolvedValue(page([]))
    const w = mountUi(PackagesView, { global: { stubs } })
    await flushPromises()
    expect(w.find('[data-testid="empty"]').text()).toContain('Todavía no hay paquetes')
    expect(w.text()).toContain('Subir el primero')
    w.unmount()
  })

  it('shows an error with retry', async () => {
    api.listPackages.mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(page([row(1)]))
    const w = mountUi(PackagesView, { global: { stubs } })
    await flushPromises()
    expect(w.text()).toContain('No pudimos cargar los paquetes')
    const retry = w.findAll('button').find(b => b.text().includes('Reintentar'))!
    await retry.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Paquete 1')
    w.unmount()
  })
})
