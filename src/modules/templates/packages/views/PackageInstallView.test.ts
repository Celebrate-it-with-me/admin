import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { bodyText, mountUi } from '@/test/mount'
import type { ValidateResult } from '../types'
import PackageInstallView from './PackageInstallView.vue'

const api = vi.hoisted(() => ({ validatePackage: vi.fn(), discardStage: vi.fn(), installPackage: vi.fn(), previewPackage: vi.fn() }))
vi.mock('../packagesApi', () => ({ ...api, useMock: false }))
const push = vi.hoisted(() => vi.fn())
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const stubs = { 'router-link': true, PackagePreviewPane: { template: '<div data-testid="preview" />' } }
const stats = { files: 3, uncompressedBytes: 1000, runtimeBytes: 1000, firstFoldBytes: 1000 }
const okResult = (): ValidateResult => ({
  valid: true, stageToken: 'tok1', expiresAt: '2026-11-16T10:00:00Z',
  report: { errors: [], warnings: [{ file: 'tokens.json', code: 'contrast_low', message: 'Contraste bajo' }], stats, manifest: { slug: 'botanical', version: '1.1.0', level: 1, visibility: 'public', tier: 'premium' } },
})
const badResult = (): ValidateResult => ({
  valid: false, stageToken: null, expiresAt: null,
  report: { errors: [{ file: 'theme.css', line: 3, code: 'css_important', message: 'No !important' }], warnings: [], stats, manifest: null },
})

const mountView = () => mountUi(PackageInstallView, { global: { stubs } })
const pick = async (w: ReturnType<typeof mountView>, file: File) => {
  const input = w.find('[data-testid="file-input"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}
const zip = (name = 'botanical-1.1.0.zip', size = 1000) => { const f = new File(['x'], name, { type: 'application/zip' }); Object.defineProperty(f, 'size', { value: size }); return f }
const button = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).filter(b => b.textContent?.trim() === label).at(-1)!

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()); push.mockReset(); api.discardStage.mockResolvedValue(undefined) })
afterEach(() => { document.body.innerHTML = '' })

describe('PackageInstallView', () => {
  it('rejects a file that is not a zip or is over 8 MB without calling the API', async () => {
    const w = mountView()
    await pick(w, zip('diseno.rar'))
    expect(w.find('[data-testid="file-error"]').text()).toContain('.zip')
    await pick(w, zip('grande.zip', 9 * 1024 * 1024))
    expect(w.find('[data-testid="file-error"]').text()).toContain('8 MB')
    expect(api.validatePackage).not.toHaveBeenCalled()
    w.unmount()
  })

  it('uploads, shows the progress and then the report with a preview and the install button', async () => {
    let finish!: (r: ValidateResult) => void
    api.validatePackage.mockImplementation((_f: File, onProgress: (p: number) => void) => { onProgress(0.4); return new Promise<ValidateResult>(r => { finish = r }) })
    const w = mountView()
    await pick(w, zip())
    expect(w.find('[data-testid="dropzone"]').text()).toContain('Subiendo… 40 %')
    finish(okResult())
    await flushPromises()
    expect(w.find('[data-testid="report"]').exists()).toBe(true)
    expect(w.text()).toContain('botanical')
    expect(w.text()).toContain('Contraste bajo')
    expect(w.text()).toContain('Instalar como borrador')
    w.unmount()
  })

  it('does not offer to install a package with errors', async () => {
    api.validatePackage.mockResolvedValue(badResult())
    const w = mountView()
    await pick(w, zip('con-errores.zip'))
    expect(w.text()).toContain('no se puede instalar')
    expect(w.text()).toContain('css_important')
    expect(w.text()).not.toContain('Instalar como borrador')
    expect(w.text()).toContain('Subir otro')
    w.unmount()
  })

  it('shows what the server said when the upload request fails', async () => {
    api.validatePackage.mockRejectedValue({ response: { status: 422, data: { errors: { package: ['not_a_zip'] } } } })
    const w = mountView()
    await pick(w, zip())
    expect(w.find('[data-testid="request-error"]').text()).toContain('no es un .zip válido')
    w.unmount()
  })

  it('installs with the reason and goes to the package', async () => {
    api.validatePackage.mockResolvedValue(okResult())
    api.installPackage.mockResolvedValue({ id: 42 })
    const w = mountView()
    await pick(w, zip())
    button('Instalar como borrador').click()
    await flushPromises()
    expect(bodyText()).toContain('Instalar botanical 1.1.0')
    const ta = document.body.querySelector<HTMLTextAreaElement>('textarea')!
    ta.value = 'Primera versión'
    ta.dispatchEvent(new Event('input'))
    await flushPromises()
    button('Instalar').click()
    await flushPromises()
    expect(api.installPackage).toHaveBeenCalledWith('tok1', 'Primera versión')
    expect(push).toHaveBeenCalledWith({ name: 'TemplatePackageDetail', params: { id: 42 }, query: { installed: '1' } })
    w.unmount()
  })

  it('shows the error of the install and a link when that version already exists', async () => {
    api.validatePackage.mockResolvedValue(okResult())
    api.installPackage.mockRejectedValue({ response: { status: 409, data: { code: 'package_exists', packageId: 3 } } })
    const w = mountView()
    await pick(w, zip())
    button('Instalar como borrador').click()
    await flushPromises()
    const ta = document.body.querySelector<HTMLTextAreaElement>('textarea')!
    ta.value = 'Primera versión'
    ta.dispatchEvent(new Event('input'))
    await flushPromises()
    button('Instalar').click()
    await flushPromises()
    expect(bodyText()).toContain('ya está instalada')
    expect(bodyText()).toContain('Ver el paquete instalado')
    expect(push).not.toHaveBeenCalled()
    w.unmount()
  })
})
