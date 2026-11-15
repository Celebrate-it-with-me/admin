import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi } from '@/test/mount'
import type { TemplateDetail, TemplateVersion } from '../types'
import TemplateEditorView from './TemplateEditorView.vue'

const api = vi.hoisted(() => ({ getTemplate: vi.fn(), getVersion: vi.fn(), saveDraft: vi.fn(), publishVersion: vi.fn(), previewPayload: vi.fn() }))
vi.mock('../services/templatesApi', () => ({ ...api, useMock: false }))
vi.mock('../packages/packagesApi', () => ({ previewPackage: vi.fn(), useMock: false }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), onBeforeRouteLeave: vi.fn() }))

const stubs = { PreviewPane: { template: '<div data-testid="old-preview" />' }, PackagePreviewPane: { template: '<div data-testid="package-preview" />' }, 'router-link': true }
const template = (): TemplateDetail => ({
  id: 1, slug: 'botanical-wedding', name: 'Botánica · Boda', eventTypeId: 2, tier: 'premium', isActive: false, currentVersion: null, draftVersionId: 3, eventsCount: 0, versions: [],
})
const version = (over: Partial<TemplateVersion> = {}): TemplateVersion => ({
  id: 3, templateId: 1, version: 1, status: 'draft', schemaVersion: 2, notes: null,
  sections: [{ type: 'cover', enabled: true, order: 1, title: { es: 'Hola', en: 'Hi' }, text: { es: null, en: null }, settings: {} }],
  theme: { theme: 'botanical', fonts: { heading: 'Fraunces', body: 'Figtree', script: 'Pinyon Script' }, preset: 'a', presets: { a: { label: { es: 'A', en: 'A' }, colors: { surface: '#fff', surfaceAlt: '#fff', ink: '#000', inkSoft: '#000', accent: '#000', primary: '#000' } } } },
  ...over,
})
const mountEditor = async (v: TemplateVersion) => {
  api.getTemplate.mockResolvedValue(template())
  api.getVersion.mockResolvedValue(v)
  const w = mountUi(TemplateEditorView, { props: { id: 1, versionId: v.id }, global: { stubs } })
  await flushPromises()
  return w
}

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()); api.previewPayload.mockResolvedValue({}) })
afterEach(() => { document.body.innerHTML = '' })

describe('TemplateEditorView with a package-managed version', () => {
  it('hides the section and theme editor and the save/publish buttons, and explains why', async () => {
    const w = await mountEditor(version({ packageId: 5 }))
    expect(w.find('[data-testid="package-managed"]').text()).toContain('la gestiona un paquete')
    expect(w.text()).toContain('Abrir el paquete')
    expect(w.text()).not.toContain('Secciones')
    expect(w.text()).not.toContain('Colores y tipografías')
    expect(w.text()).not.toContain('Guardar borrador')
    expect(w.text()).not.toContain('Publicar')
    expect(w.find('[data-testid="package-preview"]').exists()).toBe(true)
    expect(w.find('[data-testid="old-preview"]').exists()).toBe(false)
    w.unmount()
  })

  it('keeps the editor for a version without package', async () => {
    const w = await mountEditor(version())
    expect(w.find('[data-testid="package-managed"]').exists()).toBe(false)
    expect(w.text()).toContain('Secciones')
    expect(w.text()).toContain('Guardar borrador')
    w.unmount()
  })
})
