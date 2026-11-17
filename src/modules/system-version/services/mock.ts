import type { ApiVersion, StaticVersion } from '../types'

/**
 * MOCK. Stand-in for GET /api/v1/admin/system/version and for the app's /version.json, used only with
 * VITE_VERSIONS_MOCK set in dev (and screenshots). Values are invented. Modes: `true` (all fine), `api-down`,
 * `app-down`, `all-down`, `unknown` (answers without a version).
 */
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms))
const down = (): never => { throw new Error('mock_unavailable') }
const mode = () => String(import.meta.env.VITE_VERSIONS_MOCK)

export async function fetchApiVersion(): Promise<ApiVersion> {
  await wait()
  if (mode() === 'api-down' || mode() === 'all-down') down()
  if (mode() === 'unknown') return { version: '', commit: '', builtAt: '', environment: 'local', php: '8.4.1', laravel: '13.2.0' }
  return { version: '0.0.1', commit: 'a1b2c3d', builtAt: '2026-11-17T14:30:00Z', environment: 'local', php: '8.4.1', laravel: '13.2.0' }
}

export async function fetchAppVersion(): Promise<StaticVersion> {
  await wait(400)
  if (mode() === 'app-down' || mode() === 'all-down') down()
  if (mode() === 'unknown') return { name: 'cwm_app', version: '', commit: '', builtAt: '' }
  return { name: 'cwm_app', version: '0.0.1', commit: '9f8e7d6', builtAt: '2026-11-17T13:10:00Z' }
}
