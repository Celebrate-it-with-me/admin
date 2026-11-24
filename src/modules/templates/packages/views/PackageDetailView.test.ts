import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, onMounted } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { bodyText, mountUi } from '@/test/mount'
import { CHECKLIST } from '../logic'
import type { Package } from '../types'
import PackageDetailView from './PackageDetailView.vue'

const api = vi.hoisted(() => ({
  getPackage: vi.fn(), activatePackage: vi.fn(), deactivatePackage: vi.fn(), withdrawPackage: vi.fn(), getImpact: vi.fn(),
  previewPackage: vi.fn(), listGrants: vi.fn(), createGrant: vi.fn(), revokeGrant: vi.fn(),
}))
vi.mock('../packagesApi', () => ({ ...api, useMock: false }))
const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ push }) }))
vi.mock('@/store/currentUser', () => ({ useCurrentUserStore: () => ({ user: { name: 'Ana Revisora' } }) }))

// The preview stub says which combinations the reviewer "opened"; by default all of them (mobile and desktop, the three states).
const ALL_VIEWS: [string, string][] = [['mobile', 'invitation'], ['desktop', 'invitation'], ['mobile', 'save_the_date'], ['mobile', 'no_photo']]
let views: [string, string][] = ALL_VIEWS
const PreviewStub = defineComponent({
  emits: ['viewed'],
  setup(_, { emit }) { onMounted(() => { for (const [d, s] of views) emit('viewed', d, s) }) },
  template: '<div data-testid="preview" />',
})
const stubs = { 'router-link': { template: '<a><slot /></a>' }, PackagePreviewPane: PreviewStub }
const pkg = (over: Partial<Package> = {}): Package => ({
  id: 5, slug: 'botanical', semver: '1.0.0', level: 1, visibility: 'public', tier: 'premium', status: 'installed', name: { es: 'Botánica acuarela', en: 'Botanical' },
  eventTypes: ['wedding'], engineMin: 1, author: { name: 'Estudio Ejemplo', url: null }, sizeBytes: 300000, installedAt: '2026-11-14T16:20:00Z', eventsPinned: 2,
  manifest: {
    license: { id: 'commissioned', summary: 'Por encargo' },
    assetsCredits: [{ path: 'assets/img/wash-a.webp', title: 'Acuarela A', author: 'Estudio', source: 'original', license: 'commissioned' }],
    thirdPartyMarks: [],
  },
  files: [{ path: 'theme.css', size: 100, sha256: 'a', mime: 'text/css' }], templates: [{ id: 11, slug: 'botanical-wedding', versionId: 3, versionStatus: 'draft' }],
  contentHash: 'abcdef0123456789abcdef', ...over,
})
const withMarks = () => pkg({ visibility: 'private', manifest: { thirdPartyMarks: [{ name: 'Café Habana', owner: 'Habana LLC', usage: 'Logotipo' }], assetsCredits: [] } })

const mountView = async (p: Package) => {
  api.getPackage.mockResolvedValue(p)
  const w = mountUi(PackageDetailView, { props: { id: p.id }, global: { stubs } })
  await flushPromises()
  return w
}
const openReview = async (w: Awaited<ReturnType<typeof mountView>>) => {
  await w.findAll('.v-tab').find(t => t.text().includes('Revisión'))!.trigger('click')
  await flushPromises()
}
const tick = async (w: Awaited<ReturnType<typeof mountView>>) => {
  await openReview(w)
  for (const item of CHECKLIST) await w.find(`[data-item="${item.id}"] input`).setValue(true)
}
const byText = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).filter(b => b.textContent?.trim() === label).at(-1)!
const typeReason = async (text = 'Aprobado por el equipo') => {
  const ta = document.body.querySelector<HTMLTextAreaElement>('textarea')!
  ta.value = text
  ta.dispatchEvent(new Event('input'))
  await flushPromises()
}

beforeEach(() => {
  Object.values(api).forEach(fn => fn.mockReset())
  push.mockReset()
  window.localStorage.clear()
  window.sessionStorage.clear()
  views = ALL_VIEWS
  api.getImpact.mockResolvedValue({ eventsPinned: 12, eventsUnpublished: 5, templates: [] })
  api.listGrants.mockResolvedValue([])
})
afterEach(() => { document.body.innerHTML = '' })

describe('PackageDetailView', () => {
  it('shows the package facts, its templates and the credits', async () => {
    const w = await mountView(pkg())
    expect(w.text()).toContain('Botánica acuarela')
    expect(w.text()).toContain('Borrador')
    expect(w.text()).toContain('abcdef0123456789')
    expect(w.text()).toContain('commissioned')
    expect(w.text()).toContain('assets/img/wash-a.webp')
    expect(w.text()).toContain('botanical-wedding')
    w.unmount()
  })

  it('links the author URL only when it is a safe https URL, and paints hostile package text as text', async () => {
    const ok = await mountView(pkg({ author: { name: 'Estudio', url: 'https://estudio.example/' } }))
    expect(ok.find('.facts a').attributes('href')).toBe('https://estudio.example/')
    expect(ok.find('.facts a').attributes('rel')).toBe('noopener noreferrer')
    ok.unmount()
    const bad = await mountView(pkg({ author: { name: '<b>Estudio</b>', url: 'javascript:alert(1)' }, manifest: { license: { id: '<i>x</i>', summary: '<img src=x>' }, assetsCredits: [], thirdPartyMarks: [] } }))
    expect(bad.find('.facts a').exists()).toBe(false)
    expect(bad.text()).toContain('javascript:alert(1)')
    expect(bad.find('.facts b, .facts i, .facts img').exists()).toBe(false)
    bad.unmount()
  })

  it('keeps Activar off until every point of the checklist is marked, and records who marked it', async () => {
    const w = await mountView(pkg())
    const activate = () => w.find('[data-testid="activate"]')
    expect(activate().attributes('disabled')).toBeDefined()
    await tick(w)
    expect(activate().attributes('disabled')).toBeUndefined()
    expect(w.text()).toContain('Revisado por Ana Revisora')
    const stored = window.localStorage.getItem('qv.admin.pkg-checklist.5')!
    expect(Object.keys(JSON.parse(stored).contrast)).toEqual(['at'])
    expect(stored).not.toContain('Ana Revisora')
    w.unmount()
  })

  it('does not open the checklist until the preview was seen on mobile and desktop and in every state', async () => {
    views = [['mobile', 'invitation'], ['mobile', 'save_the_date']]
    const w = await mountView(pkg())
    await openReview(w)
    const box = () => w.find('[data-item="contrast"] input')
    expect(box().attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="preview-gate"]').text()).toContain('escritorio')
    expect(w.find('[data-testid="preview-gate"]').text()).toContain('Sin foto')
    expect(w.find('[data-testid="preview-gate"]').text()).not.toContain('móvil')
    expect(w.find('[data-testid="activate"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('tells next to Activar what is missing, and points the disabled button at it', async () => {
    views = [['mobile', 'invitation'], ['mobile', 'save_the_date']]
    const w = await mountView(pkg())
    expect(w.find('[data-testid="activation-summary"]').text()).toContain('vista de móvil')
    await openReview(w)
    const hint = w.find('[data-testid="activation-summary"]')
    expect(hint.text()).toBe('Falta: vista de escritorio · estado «Sin foto» · 0 de 6 comprobaciones')
    const btn = w.find('[data-testid="activate"]')
    expect(btn.attributes('aria-describedby')).toBe('activation-hint')
    expect(w.find('#activation-hint').exists()).toBe(true)
    expect(btn.attributes('title')).toContain('Aún no se puede activar')
    expect(hint.attributes('aria-live')).toBe('polite')
    expect(w.findAll('[data-testid="activation-progress"] li').map(li => li.attributes('data-done'))).toEqual(['true', 'false', 'true', 'true', 'false', 'false'])
    expect(w.find('[data-testid="activation-progress"]').text()).toContain('Pendiente: Vista de escritorio')
    w.unmount()
  })

  it('counts the checks in the hint and says all is ready at the end', async () => {
    const w = await mountView(pkg())
    await openReview(w)
    await w.find('[data-item="contrast"] input').setValue(true)
    expect(w.find('[data-testid="activation-summary"]').text()).toBe('Falta: 1 de 6 comprobaciones')
    for (const item of CHECKLIST) await w.find(`[data-item="${item.id}"] input`).setValue(true)
    expect(w.find('[data-testid="activation-summary"]').text()).toBe('Todo listo para activar.')
    expect(w.find('[data-testid="activate"]').attributes('aria-describedby')).toBeUndefined()
    w.unmount()
  })

  it('restores in this tab what was opened in the preview, per version, and saves it as it grows', async () => {
    views = [['mobile', 'invitation']]
    const first = await mountView(pkg())
    await openReview(first)
    expect(window.sessionStorage.getItem('qv.admin.pkg-coverage.5.1.0.0')).toContain('"invitation"')
    first.unmount()
    views = []
    const back = await mountView(pkg())
    await openReview(back)
    expect(back.find('[data-testid="activation-summary"]').text()).toContain('vista de escritorio')
    expect(back.find('[data-testid="activation-summary"]').text()).not.toContain('vista de móvil')
    expect(back.find('[data-testid="activation-summary"]').text()).not.toContain('«Invitación»')
    back.unmount()
    const other = await mountView(pkg({ semver: '1.1.0' }))
    await openReview(other)
    expect(other.find('[data-testid="activation-summary"]').text()).toContain('vista de móvil')
    other.unmount()
  })

  it('shows why the preview cannot be completed next to the button', async () => {
    views = []
    const w = await mountView(pkg())
    await openReview(w)
    await w.findComponent(PreviewStub).vm.$emit('problem', 'La app no respondió a tiempo.')
    expect(w.find('[data-testid="activation-problem"]').text()).toContain('La app no respondió a tiempo.')
    w.unmount()
  })

  it('does not trust ticks restored from the browser: activating still needs the preview', async () => {
    views = []
    window.localStorage.setItem('qv.admin.pkg-checklist.5', JSON.stringify(Object.fromEntries(CHECKLIST.map(i => [i.id, { at: '2026-11-15T10:00:00Z', by: 'Intruso' }]))))
    const w = await mountView(pkg())
    await openReview(w)
    expect(w.find('[data-testid="activate"]').attributes('disabled')).toBeDefined()
    expect(w.text()).not.toContain('Intruso')
    w.unmount()
  })

  it('activates with the reason and reports how many events stay on the previous version', async () => {
    api.activatePackage.mockResolvedValue({ package: pkg({ status: 'active' }), eventsOnPreviousVersion: 17 })
    const w = await mountView(pkg())
    await tick(w)
    await w.find('[data-testid="activate"]').trigger('click')
    await flushPromises()
    await typeReason()
    byText('Activar paquete').click()
    await flushPromises()
    expect(api.activatePackage).toHaveBeenCalledWith(5, 'Aprobado por el equipo', { accessibility: true, contrast: true, long_names: true, no_photo: true, sections_reordered: true, performance: true }, undefined)
    expect(w.text()).toContain('17 eventos siguen en la versión anterior')
    expect(w.find('[data-status="active"]').exists()).toBe(true)
    w.unmount()
  })

  it('shows the marks banner and demands the explicit confirmation before activating', async () => {
    api.activatePackage.mockResolvedValue({ package: pkg({ status: 'active' }), eventsOnPreviousVersion: 0 })
    const w = await mountView(withMarks())
    expect(w.find('[data-testid="marks-banner"]').text()).toContain('Café Habana')
    await tick(w)
    await w.find('[data-testid="activate"]').trigger('click')
    await flushPromises()
    await typeReason()
    const confirm = byText('Activar paquete')
    expect(confirm.disabled).toBe(true)
    const ack = Array.from(document.body.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')).find(i => i.closest('.v-dialog'))!
    ack.click()
    await flushPromises()
    expect(byText('Activar paquete').disabled).toBe(false)
    byText('Activar paquete').click()
    await flushPromises()
    expect(api.activatePackage).toHaveBeenCalledWith(5, 'Aprobado por el equipo', expect.objectContaining({ sections_reordered: true }), true)
    w.unmount()
  })

  it('shows the count of unpublished events before deactivating and sends the reason', async () => {
    api.deactivatePackage.mockResolvedValue(pkg({ status: 'deactivated' }))
    const w = await mountView(pkg({ status: 'active' }))
    await w.find('[data-testid="deactivate"]').trigger('click')
    await flushPromises()
    expect(api.getImpact).toHaveBeenCalledWith(5, 'deactivate')
    expect(bodyText()).toContain('5 eventos sin publicar usan este paquete')
    expect(bodyText()).toContain('12 eventos ya publicados')
    await typeReason('Error de diseño')
    byText('Desactivar').click()
    await flushPromises()
    expect(api.deactivatePackage).toHaveBeenCalledWith(5, 'Error de diseño')
    expect(w.find('[data-status="deactivated"]').exists()).toBe(true)
    w.unmount()
  })

  it('refuses to withdraw a package that still has pinned events', async () => {
    const w = await mountView(pkg({ status: 'active' }))
    await w.find('[data-testid="withdraw"]').trigger('click')
    await flushPromises()
    expect(api.getImpact).toHaveBeenCalledWith(5, 'withdraw')
    expect(bodyText()).toContain('No se puede retirar: 12 eventos')
    expect(byText('Retirar para siempre').disabled).toBe(true)
    w.unmount()
  })

  it('withdraws a package nobody uses and goes back to the list', async () => {
    api.getImpact.mockResolvedValue({ eventsPinned: 0, eventsUnpublished: 0, templates: [] })
    api.withdrawPackage.mockResolvedValue(undefined)
    const w = await mountView(pkg())
    await w.find('[data-testid="withdraw"]').trigger('click')
    await flushPromises()
    await typeReason('Se retira del catálogo')
    byText('Retirar para siempre').click()
    await flushPromises()
    expect(api.withdrawPackage).toHaveBeenCalledWith(5, 'Se retira del catálogo')
    expect(push).toHaveBeenCalledWith({ name: 'TemplatePackages' })
    w.unmount()
  })

  it('shows the grants tab only for private packages', async () => {
    const pub = await mountView(pkg())
    expect(pub.text()).not.toContain('Accesos')
    pub.unmount()
    const priv = await mountView(pkg({ visibility: 'private' }))
    expect(priv.text()).toContain('Accesos')
    priv.unmount()
  })

  it('offers a retry when the package cannot be loaded', async () => {
    api.getPackage.mockRejectedValue({ response: { status: 404, data: { code: 'package_not_found' } } })
    const w = mountUi(PackageDetailView, { props: { id: 99 }, global: { stubs } })
    await flushPromises()
    expect(w.text()).toContain('No encontramos ese paquete')
    expect(w.text()).toContain('Reintentar')
    w.unmount()
  })
})
