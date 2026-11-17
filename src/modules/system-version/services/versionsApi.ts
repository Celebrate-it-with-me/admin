import { API } from '@/services/axios'
import type { ApiVersion, StaticVersion } from '../types'

/**
 * Clients of the three version sources (contract: API admin/system/version, app {VITE_APP_URL}/version.json, admin
 * /version.json). With VITE_VERSIONS_MOCK set in dev, the API and app calls use ./mock.ts instead of the network.
 */
export const useMock = import.meta.env.DEV && !!import.meta.env.VITE_VERSIONS_MOCK

/** Dynamic so the production bundle (where useMock is statically false) does not contain the mock. */
const loadMock = () => import('./mock')

export async function fetchApiVersion(): Promise<ApiVersion> {
  if (useMock) return (await loadMock()).fetchApiVersion()
  return (await API.get('system/version')).data
}

/** Cross-origin read of a static file: a network or CORS failure rejects, and the card shows "No disponible". */
export async function fetchAppVersion(): Promise<StaticVersion> {
  if (useMock) return (await loadMock()).fetchAppVersion()
  const base = String(import.meta.env.VITE_APP_URL ?? '').replace(/\/+$/, '')
  if (!base) throw new Error('app_url_missing')
  const response = await fetch(`${base}/version.json`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error(`http_${response.status}`)
  return response.json()
}

/** This admin's own build, injected by Vite (see vite.config.ts). */
export const adminVersion = (): StaticVersion => ({ name: 'cwm_admin', version: __APP_VERSION__, commit: __APP_COMMIT__, builtAt: __APP_BUILT_AT__ })
