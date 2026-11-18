import { beforeEach, describe, expect, it } from 'vitest'
import { hasZipSignature, coverageDone, coverageMissing, emptyCoverage,
  CHECKLIST, MAX_ZIP_BYTES, checklistPayload, canActivate, canDeactivate, canWithdraw, checkZip, checklistDone, checklistProgress, codeHelp, explainPackageError,
  formatBytes, groupReport, impactMessage, loadChecklist, presetOptions, saveChecklist,
} from './logic'
import type { ReportItem } from './types'

const item = (file: string | null, code: string, line: number | null = null): ReportItem => ({ file, code, line, message: code })
const http = (status: number, data: Record<string, unknown> = {}) => ({ response: { status, data } })

describe('checkZip', () => {
  it('accepts a zip of up to 8 MB', () => {
    expect(checkZip({ name: 'botanical-1.0.0.ZIP', size: 1000 })).toBeNull()
    expect(checkZip({ name: 'a.zip', size: MAX_ZIP_BYTES })).toBeNull()
  })
  it('rejects other extensions, empty files and files over 8 MB', () => {
    expect(checkZip({ name: 'a.rar', size: 10 })).toMatch(/\.zip/)
    expect(checkZip({ name: 'a.zip.exe', size: 10 })).toMatch(/\.zip/)
    expect(checkZip({ name: 'a.zip', size: 0 })).toMatch(/vacío/)
    expect(checkZip({ name: 'a.zip', size: MAX_ZIP_BYTES + 1 })).toMatch(/8 MB/)
  })
})

describe('formatBytes', () => {
  it('uses B, KB and MB', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(311220)).toBe('304 KB')
    expect(formatBytes(8 * 1024 * 1024)).toBe('8.0 MB')
    expect(formatBytes(null)).toBe('—')
  })
})

describe('groupReport', () => {
  it('groups by file: general first, then files with errors, then the rest by name', () => {
    const groups = groupReport({
      errors: [item('theme.css', 'css_important', 31), item('theme.css', 'css_url_external', 14), item(null, 'license_missing')],
      warnings: [item('assets/a.webp', 'budget_exceeded'), item('manifest.json', 'contrast_low'), item('theme.css', 'css_costly_property', 88)],
    })
    expect(groups.map(g => g.label)).toEqual(['Paquete (general)', 'theme.css', 'assets/a.webp', 'manifest.json'])
    expect(groups[1].errors.map(e => e.line)).toEqual([14, 31])
    expect(groups[1].warnings).toHaveLength(1)
  })
  it('is empty without problems', () => {
    expect(groupReport({ errors: [], warnings: [] })).toEqual([])
  })
})

describe('codeHelp', () => {
  it('explains known codes and returns null for unknown ones', () => {
    expect(codeHelp('css_url_external')).toMatch(/assets/)
    expect(codeHelp('something_new')).toBeNull()
    for (const c of ['block_container_property', 'block_container_too_small', 'state_selector_property', 'behavior_on_music', 'animation_too_fast', 'low_contrast_declared', 'module_block_missing', 'section_without_block']) {
      expect(codeHelp(c)?.length).toBeGreaterThan(40)
    }
    expect(codeHelp('section_without_block')).not.toMatch(/detalle/)
  })
})

describe('checklist', () => {
  beforeEach(() => window.localStorage.clear())
  it('is done only when every point has an entry', () => {
    const state = Object.fromEntries(CHECKLIST.slice(0, -1).map(i => [i.id, { by: 'Ana', at: '2026-11-15T10:00:00Z' }]))
    expect(checklistProgress(state)).toBe(CHECKLIST.length - 1)
    expect(checklistDone(state)).toBe(false)
    state[CHECKLIST.at(-1)!.id] = { by: 'Ana', at: '2026-11-15T10:05:00Z' }
    expect(checklistDone(state)).toBe(true)
  })
  it('persists per package in the browser and survives a broken store', () => {
    saveChecklist(3, { contrast: { by: 'Ana', at: '2026-11-15T10:00:00Z' } })
    expect(window.localStorage.getItem('qv.admin.pkg-checklist.3')).toBe('{"contrast":{"at":"2026-11-15T10:00:00Z"}}')
    expect(loadChecklist(3, 'Ana')).toEqual({ contrast: { by: 'Ana', at: '2026-11-15T10:00:00Z' } })
    expect(loadChecklist(4)).toEqual({})
    window.localStorage.setItem('qv.admin.pkg-checklist.5', '{no json')
    expect(loadChecklist(5)).toEqual({})
  })
  it('keeps only known ids with a real date from what it reads back', () => {
    window.localStorage.setItem('qv.admin.pkg-checklist.6', JSON.stringify({ contrast: { at: 'not a date' }, hacked: { at: '2026-11-15T10:00:00Z' }, performance: { at: '2026-11-15T10:00:00Z', by: 'Intruso' }, accessibility: 'yes' }))
    expect(loadChecklist(6, 'Ana')).toEqual({ performance: { by: 'Ana', at: '2026-11-15T10:00:00Z' } })
    window.localStorage.setItem('qv.admin.pkg-checklist.7', '[1,2]')
    expect(loadChecklist(7)).toEqual({})
  })
  it('asks for the preview on both devices and in every state', () => {
    expect(coverageMissing(emptyCoverage())).toEqual(['móvil', 'escritorio', 'Invitación', 'Guarda la fecha', 'Sin foto'])
    expect(coverageDone({ devices: ['mobile', 'desktop'], states: ['invitation', 'save_the_date', 'no_photo'] })).toBe(true)
    expect(coverageMissing({ devices: ['mobile'], states: ['invitation', 'no_photo'] })).toEqual(['escritorio', 'Guarda la fecha'])
  })
})

describe('hasZipSignature', () => {
  it('accepts the zip header and refuses anything else with a .zip name', async () => {
    expect(await hasZipSignature(new Blob([new Uint8Array([0x50, 0x4b, 3, 4, 9, 9])]))).toBe(true)
    expect(await hasZipSignature(new Blob(['<html><script>alert(1)</script>']))).toBe(false)
    expect(await hasZipSignature(new Blob([]))).toBe(false)
  })
})

describe('checklistPayload', () => {
  it('sends the six keys of the contract, all true', () => {
    expect(checklistPayload()).toEqual({ accessibility: true, contrast: true, long_names: true, no_photo: true, sections_reordered: true, performance: true })
  })
})

describe('actions by status', () => {
  it('allows each action only in its states', () => {
    expect(canActivate({ status: 'installed' })).toBe(true)
    expect(canActivate({ status: 'deactivated' })).toBe(true)
    expect(canActivate({ status: 'active' })).toBe(false)
    expect(canDeactivate({ status: 'active' })).toBe(true)
    expect(canDeactivate({ status: 'installed' })).toBe(false)
    expect(canWithdraw({ status: 'withdrawn' })).toBe(false)
  })
  it('words the impact of deactivating', () => {
    expect(impactMessage(0)).toMatch(/Ningún evento/)
    expect(impactMessage(1)).toBe('1 evento sin publicar usa este paquete y pasará a la plantilla gratuita.')
    expect(impactMessage(5)).toBe('5 eventos sin publicar usan este paquete y pasarán a la plantilla gratuita.')
  })
})

describe('presetOptions', () => {
  it('lists the presets with their Spanish label', () => {
    expect(presetOptions({ salvia: { label: { es: 'Salvia', en: 'Sage' } }, x: {} })).toEqual([{ id: 'salvia', label: 'Salvia' }, { id: 'x', label: 'x' }])
    expect(presetOptions(undefined)).toEqual([])
  })
})

describe('explainPackageError', () => {
  it('explains a lost connection', () => {
    expect(explainPackageError(new Error('network'))).toMatchObject({ status: null, code: null, message: expect.stringContaining('conexión') })
  })
  it('maps codes of 403/404/409/410 and keeps the extras', () => {
    expect(explainPackageError(http(409, { code: 'package_in_use', eventsPinned: 4 }))).toMatchObject({ code: 'package_in_use', eventsPinned: 4, message: expect.stringContaining('no se puede retirar') })
    expect(explainPackageError(http(409, { code: 'package_exists', packageId: 12 })).packageId).toBe(12)
    expect(explainPackageError(http(410, { code: 'stage_expired' })).message).toMatch(/caducó/)
    expect(explainPackageError(http(404, { code: 'stage_not_found' })).message).toMatch(/subir/)
    expect(explainPackageError(http(403, { code: 'forbidden' })).message).toMatch(/superadmin/)
    expect(explainPackageError(http(429, { code: 'too_many_attempts' })).message).toMatch(/intentos/)
  })
  it('reads 422 field errors by their first code', () => {
    expect(explainPackageError(http(422, { errors: { reason: ['min'] } })).message).toMatch(/5 caracteres/)
    expect(explainPackageError(http(422, { errors: { ack_third_party_marks: ['required'] } })).message).toMatch(/marcas/)
    expect(explainPackageError(http(422, { errors: { checklist: ['incomplete'] } })).message).toMatch(/lista de comprobación/)
    expect(explainPackageError(http(422, { errors: { package: ['too_large'] } })).message).toMatch(/8 MB/)
    expect(explainPackageError(http(422, { errors: { package: ['engine_too_new'] } })).message).toMatch(/motor/)
    expect(explainPackageError(http(422, { errors: { stage_token: ['invalid_report'] } })).fields).toEqual({ stage_token: 'invalid_report' })
  })
  it('never shows a raw code: every 422/409/403 code of the package endpoints has a Spanish sentence', () => {
    const raw = /^[a-z0-9_.:-]+$/i
    const field = (f: string, c: string) => http(422, { message: c, errors: { [f]: [c] } })
    const cases: Array<[unknown, RegExp]> = [
      [field('reason', 'required'), /motivo/],
      [field('stage_token', 'required'), /obligatorio/],
      [field('checklist', 'incomplete'), /lista de comprobación/],
      [field('stage_token', 'invalid_report'), /informe/],
      [field('version', 'version_not_greater'), /versión debe ser mayor/],
      [http(409, { message: 'draft_exists', code: 'draft_exists' }), /borrador abierto/],
      [http(409, { message: 'package_managed', code: 'package_managed' }), /gestiona un paquete/],
      [http(409, { message: 'install_busy', code: 'install_busy' }), /otra instalación/i],
      [http(410, { message: 'stage_expired', code: 'stage_expired' }), /caducó/],
      [http(403, { message: 'stage_forbidden', code: 'stage_forbidden' }), /otro administrador/],
      [http(409, { message: 'stage_corrupt', code: 'stage_corrupt' }), /no coinciden/],
    ]
    for (const [e, re] of cases) {
      const m = explainPackageError(e).message
      expect(m, m).toMatch(re)
      expect(m).not.toMatch(raw)
    }
  })
  it('never falls back to a raw server message that is only a code', () => {
    expect(explainPackageError(http(422, { message: 'weird_code' })).message).toBe('Los datos no son válidos.')
    expect(explainPackageError(http(422, { message: 'Texto legible del servidor.' })).message).toBe('Texto legible del servidor.')
    expect(explainPackageError(http(422, { errors: { x: ['unknown_code'] }, message: 'unknown_code' })).message).toBe('Los datos no son válidos.')
  })
  it('keeps the list of differences of a corrupt stage', () => {
    const e = explainPackageError(http(409, { code: 'stage_corrupt', differences: ['assets/a.png', 'template.json'] }))
    expect(e.differences).toEqual(['assets/a.png', 'template.json'])
    expect(explainPackageError(http(404, { code: 'package_not_found' })).differences).toEqual([])
  })
  it('tells apart a cancelled re-authentication', () => {
    expect(explainPackageError({ reauthCancelled: true, response: { status: 403, data: { code: 'reauth_required' } } })).toMatchObject({ reauthCancelled: true })
  })
})
