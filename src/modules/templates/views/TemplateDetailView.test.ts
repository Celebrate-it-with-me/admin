import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi } from '@/test/mount'
import type { TemplateDetail } from '../types'
import TemplateDetailView from './TemplateDetailView.vue'

const api = vi.hoisted(() => ({ getTemplate: vi.fn(), createDraft: vi.fn(), archiveVersion: vi.fn() }))
vi.mock('../services/templatesApi', () => ({ ...api, useMock: false }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const detail = (): TemplateDetail => ({
  id: 1, slug: 'botanical-wedding', name: 'Botánica · Boda', eventTypeId: 2, tier: 'premium', isActive: true, currentVersion: null, draftVersionId: 3, eventsCount: 0,
  versions: [
    { id: 3, version: 2, status: 'draft', notes: null, createdAt: null, publishedAt: null, eventsCount: 0, packageId: 5 },
    { id: 4, version: 3, status: 'draft', notes: null, createdAt: null, publishedAt: null, eventsCount: 0, packageId: null },
  ],
})

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()) })
afterEach(() => { document.body.innerHTML = '' })

describe('TemplateDetailView', () => {
  it('offers Archivar only for the draft that no package manages', async () => {
    api.getTemplate.mockResolvedValue(detail())
    const w = mountUi(TemplateDetailView, { props: { id: 1 } })
    await flushPromises()
    const archive = w.findAll('button').filter(b => b.text() === 'Archivar')
    // one per layout (table and cards), both for the version without package only
    expect(archive.length).toBe(2)
    expect(w.text()).toContain('Paquete')
    w.unmount()
  })
})
