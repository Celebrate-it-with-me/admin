import { afterEach, describe, expect, it } from 'vitest'
import { mountUi } from '@/test/mount'
import ValidationReport from './ValidationReport.vue'
import type { ValidationReport as Report } from '../types'

const stats = { files: 31, uncompressedBytes: 1203412, runtimeBytes: 400 * 1024, firstFoldBytes: 140100 }
const report = (over: Partial<Report> = {}): Report => ({ errors: [], warnings: [], stats, manifest: null, ...over })

afterEach(() => { document.body.innerHTML = '' })

describe('ValidationReport', () => {
  it('groups errors and warnings by file with code, line, message and detail', () => {
    const w = mountUi(ValidationReport, { props: { report: report({
      errors: [{ file: 'theme.css', line: 14, code: 'css_url_external', message: 'url() fuera de assets/', detail: 'https://x/y.png' }],
      warnings: [{ file: 'theme.css', code: 'css_costly_property', message: 'filter es costoso' }, { file: 'assets/a.webp', code: 'budget_exceeded', message: 'Pesa mucho' }],
    }) } })
    const css = w.find('[data-file="theme.css"]')
    expect(css.text()).toContain('css_url_external')
    expect(css.text()).toContain('línea 14')
    expect(css.text()).toContain('url() fuera de assets/')
    expect(css.text()).toContain('https://x/y.png')
    expect(css.text()).toContain('solo puede apuntar a archivos de assets')
    expect(css.findAll('[data-severity="error"]')).toHaveLength(1)
    expect(css.findAll('[data-severity="warning"]')).toHaveLength(1)
    expect(w.find('[data-file="assets/a.webp"] [data-severity="warning"]').exists()).toBe(true)
    expect(w.text()).toContain('1 error')
    expect(w.text()).toContain('2 avisos')
    w.unmount()
  })

  it('puts problems of the whole package in a general group', () => {
    const w = mountUi(ValidationReport, { props: { report: report({ errors: [{ file: null, code: 'license_missing', message: 'Falta LICENSES.md' }] }) } })
    expect(w.find('[data-file="general"]').text()).toContain('Paquete (general)')
    w.unmount()
  })

  it('says so when there is nothing to report and marks a runtime weight over budget', () => {
    const w = mountUi(ValidationReport, { props: { report: report() } })
    expect(w.text()).toContain('Sin errores')
    expect(w.text()).toContain('no tiene errores ni avisos')
    expect(w.find('.over').exists()).toBe(true)
    w.unmount()
  })

  it('shows the third-party marks banner, the license and the credits table from the report manifest', () => {
    const manifest = {
      slug: 'habana-vip', version: '0.3.0', level: 1, visibility: 'private' as const, tier: 'premium',
      thirdPartyMarks: [{ name: 'Café Habana', owner: 'Habana LLC', usage: 'Logotipo en el cierre' }],
      license: { id: 'commissioned', summary: 'Por encargo' },
      assetsCredits: [{ path: 'assets/img/wash-a.webp', title: 'Acuarela A', author: 'Estudio', source: 'original', license: 'commissioned' }],
    }
    const w = mountUi(ValidationReport, { props: { report: report({ manifest, warnings: [{ file: 'manifest.json', code: 'third_party_marks_declared', message: 'Declara 1 marca' }] }) } })
    expect(w.find('[data-testid="marks-banner"]').text()).toContain('Café Habana')
    expect(w.find('[data-testid="marks-banner"]').text()).toContain('Habana LLC')
    expect(w.find('[data-testid="credits"]').text()).toContain('assets/img/wash-a.webp')
    expect(w.text()).toContain('Por encargo')
    w.unmount()
  })

  it('shows the banner from the warning alone when the table is not available yet', () => {
    const w = mountUi(ValidationReport, { props: { report: report({ warnings: [{ file: 'manifest.json', code: 'third_party_marks_declared', message: 'Declara 1 marca', detail: 'Café Habana' }] }) } })
    expect(w.find('[data-testid="marks-banner"]').text()).toContain('Café Habana')
    w.unmount()
  })
})
