import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountUi, bodyText } from '@/test/mount'

const api = vi.hoisted(() => ({ fetchApiVersion: vi.fn(), fetchAppVersion: vi.fn() }))
vi.mock('../services/versionsApi', () => ({
  useMock: false,
  fetchApiVersion: api.fetchApiVersion,
  fetchAppVersion: api.fetchAppVersion,
  adminVersion: () => ({ name: 'cwm_admin', version: '0.0.1', commit: 'ffff000', builtAt: '2026-11-17T09:00:00Z' }),
}))

import VersionsView from './VersionsView.vue'

const okApi = { version: '1.4.0', commit: 'aaaaaaa1', builtAt: '2026-11-17T10:00:00Z', environment: 'production', php: '8.4.2', laravel: '13.1.0' }
const okApp = { name: 'cwm_app', version: '2.0.0', commit: 'bbbbbbb2', builtAt: '2026-11-17T11:00:00Z' }

const show = async () => {
  const wrapper = mountUi(VersionsView)
  await flushPromises()
  return wrapper
}
const card = (w: Awaited<ReturnType<typeof show>>, i: number) => w.findAll('.vcard')[i]

afterEach(() => { document.body.innerHTML = '' })

describe('VersionsView', () => {
  it('shows the three services', async () => {
    api.fetchApiVersion.mockResolvedValue(okApi)
    api.fetchAppVersion.mockResolvedValue(okApp)
    const w = await show()
    expect(card(w, 0).text()).toContain('v1.4.0')
    expect(card(w, 0).text()).toContain('aaaaaaa')
    expect(card(w, 0).text()).toContain('8.4.2')
    expect(card(w, 0).text()).toContain('13.1.0')
    expect(card(w, 0).text()).toContain('Producción')
    expect(card(w, 1).text()).toContain('v2.0.0')
    expect(card(w, 2).text()).toContain('v0.0.1')
    expect(card(w, 2).text()).toContain('ffff000')
    expect(w.findAll('[data-test="down"]')).toHaveLength(0)
  })

  it('marks only the failed service as unavailable', async () => {
    api.fetchApiVersion.mockResolvedValue(okApi)
    api.fetchAppVersion.mockRejectedValue(new Error('cors'))
    const w = await show()
    expect(card(w, 1).text()).toContain('No disponible')
    expect(card(w, 0).text()).toContain('v1.4.0')
    expect(card(w, 2).text()).toContain('v0.0.1')
  })

  it('survives every remote service being down; the admin still shows', async () => {
    api.fetchApiVersion.mockRejectedValue(new Error('500'))
    api.fetchAppVersion.mockRejectedValue(new Error('net'))
    const w = await show()
    expect(w.findAll('[data-test="down"]')).toHaveLength(2)
    expect(card(w, 2).text()).toContain('v0.0.1')
  })

  it('says unknown when a service answers without a version', async () => {
    api.fetchApiVersion.mockResolvedValue({ ...okApi, version: '', commit: '' })
    api.fetchAppVersion.mockResolvedValue(okApp)
    const w = await show()
    expect(card(w, 0).text()).toContain('Desconocida')
    expect(card(w, 0).text()).toContain('Desconocido')
    expect(bodyText()).not.toContain('undefined')
  })

  it('retries one service from its card', async () => {
    api.fetchApiVersion.mockResolvedValue(okApi)
    api.fetchAppVersion.mockRejectedValueOnce(new Error('net')).mockResolvedValue(okApp)
    const w = await show()
    await card(w, 1).find('button').trigger('click')
    await flushPromises()
    expect(card(w, 1).text()).toContain('v2.0.0')
  })
})
