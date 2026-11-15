import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), delete: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('./mock', () => ({}))

// A developer's .env.local may switch the mock on; these tests are about the real client.
vi.stubEnv('VITE_TEMPLATES_PACKAGES_MOCK', 'false')
const api = await import('./packagesApi')

beforeEach(() => { Object.values(http).forEach(fn => fn.mockReset()) })

describe('packagesApi', () => {
  it('lists with snake_case query and returns items and meta', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: 1 }], meta: { page: 2, perPage: 10, total: 11 } } })
    const r = await api.listPackages({ status: 'active', visibility: 'private', page: 2, perPage: 10 })
    expect(http.get).toHaveBeenCalledWith('templates/packages', { params: { status: 'active', visibility: 'private', page: 2, per_page: 10 } })
    expect(r).toEqual({ items: [{ id: 1 }], meta: { page: 2, perPage: 10, total: 11 } })
  })

  it('omits empty filters and invents meta when the API sends none', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: 1 }, { id: 2 }] } })
    const r = await api.listPackages({ status: null })
    expect(http.get.mock.calls[0][1]).toEqual({ params: {} })
    expect(r.meta).toEqual({ page: 1, perPage: 2, total: 2 })
  })

  it('gets one package', async () => {
    http.get.mockResolvedValue({ data: { data: { id: 7 } } })
    expect(await api.getPackage(7)).toEqual({ id: 7 })
    expect(http.get).toHaveBeenCalledWith('templates/packages/7')
  })

  it('uploads the zip as multipart field `package` and reports the progress as a fraction', async () => {
    http.post.mockImplementation(async (_url: string, _body: unknown, config: { onUploadProgress: (e: { loaded: number; total: number }) => void }) => {
      config.onUploadProgress({ loaded: 50, total: 200 })
      return { data: { data: { valid: true, stageToken: 'tok', expiresAt: null, report: { errors: [], warnings: [] } } } }
    })
    const seen: number[] = []
    const file = new File(['zip'], 'botanical-1.0.0.zip', { type: 'application/zip' })
    const r = await api.validatePackage(file, p => seen.push(p))
    const [url, form] = http.post.mock.calls[0]
    expect(url).toBe('templates/packages/validate')
    expect(form).toBeInstanceOf(FormData)
    expect((form as FormData).get('package')).toBe(file)
    expect(seen).toEqual([0.25])
    expect(r.stageToken).toBe('tok')
  })

  it('discards a stage by token', async () => {
    http.delete.mockResolvedValue({ data: { data: null } })
    await api.discardStage('a/b')
    expect(http.delete).toHaveBeenCalledWith('templates/packages/stages/a%2Fb')
  })

  it('installs with stage_token and reason', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 9 } } })
    expect(await api.installPackage('tok', 'Primera versión')).toEqual({ id: 9 })
    expect(http.post).toHaveBeenCalledWith('templates/packages', { stage_token: 'tok', reason: 'Primera versión' })
  })

  it('asks the impact of an action', async () => {
    http.get.mockResolvedValue({ data: { data: { eventsPinned: 3, eventsUnpublished: 2, templates: [] } } })
    expect((await api.getImpact(4, 'deactivate')).eventsUnpublished).toBe(2)
    expect(http.get).toHaveBeenCalledWith('templates/packages/4/impact', { params: { action: 'deactivate' } })
  })

  it('activates with the reason, adding ack_third_party_marks only when given', async () => {
    http.post.mockResolvedValue({ data: { data: { package: { id: 4 }, eventsOnPreviousVersion: 17 } } })
    await api.activatePackage(4, 'Aprobado por el equipo')
    expect(http.post).toHaveBeenLastCalledWith('templates/packages/4/activate', { reason: 'Aprobado por el equipo' })
    expect((await api.activatePackage(4, 'Aprobado por el equipo', true)).eventsOnPreviousVersion).toBe(17)
    expect(http.post).toHaveBeenLastCalledWith('templates/packages/4/activate', { reason: 'Aprobado por el equipo', ack_third_party_marks: true })
  })

  it('deactivates with POST and withdraws with DELETE carrying the reason', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 4 } } })
    http.delete.mockResolvedValue({ data: { data: null } })
    await api.deactivatePackage(4, 'Error de diseño')
    expect(http.post).toHaveBeenCalledWith('templates/packages/4/deactivate', { reason: 'Error de diseño' })
    await api.withdrawPackage(4, 'Se retira del catálogo')
    expect(http.delete).toHaveBeenCalledWith('templates/packages/4', { data: { reason: 'Se retira del catálogo' } })
  })

  it('manages grants with snake_case targets', async () => {
    http.get.mockResolvedValue({ data: { data: [{ id: 1 }] } })
    http.post.mockResolvedValue({ data: { data: { id: 2 } } })
    expect(await api.listGrants(4)).toEqual([{ id: 1 }])
    expect(http.get).toHaveBeenCalledWith('templates/packages/4/grants')
    await api.createGrant(4, { eventId: 77 }, 'Cliente VIP')
    expect(http.post).toHaveBeenLastCalledWith('templates/packages/4/grants', { reason: 'Cliente VIP', event_id: 77 })
    await api.createGrant(4, { userId: 5 }, 'Cliente VIP')
    expect(http.post).toHaveBeenLastCalledWith('templates/packages/4/grants', { reason: 'Cliente VIP', user_id: 5 })
    await api.revokeGrant(4, 2, 'Ya no aplica')
    expect(http.post).toHaveBeenLastCalledWith('templates/packages/4/grants/2/revoke', { reason: 'Ya no aplica' })
  })

  it('previews through the existing endpoint with the package ids', async () => {
    http.post.mockResolvedValue({ data: { data: { theme: {} } } })
    await api.previewPackage({ locale: 'es', eventType: 'wedding', stage_token: 'tok', preset: 'salvia', state: 'no_photo' })
    expect(http.post).toHaveBeenCalledWith('templates/preview', { locale: 'es', eventType: 'wedding', stage_token: 'tok', preset: 'salvia', state: 'no_photo' })
  })
})
