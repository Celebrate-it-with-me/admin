import type { ApiVersion, StaticVersion, VersionInfo } from './types'

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null)

/** A body that is not an object (an HTML page from a proxy, null...) is a failure, not "unknown version". */
const asObject = (body: unknown): Record<string, unknown> => {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>
  throw new Error('invalid_version_payload')
}

export function normalizeApi(body: Partial<ApiVersion> | unknown): VersionInfo {
  const b = asObject(body)
  return { version: text(b.version), commit: text(b.commit), builtAt: text(b.builtAt), environment: text(b.environment), php: text(b.php), laravel: text(b.laravel) }
}

export function normalizeStatic(body: Partial<StaticVersion> | unknown): VersionInfo {
  const b = asObject(body)
  return { version: text(b.version), commit: text(b.commit), builtAt: text(b.builtAt), environment: null, php: null, laravel: null }
}

export const shortCommit = (commit: string | null): string => (commit && commit !== 'unknown' ? commit.slice(0, 7) : 'Desconocido')

export const versionLabel = (version: string | null): string => (version ? `v${version.replace(/^v/i, '')}` : 'Desconocida')

export function buildDate(iso: string | null): string {
  if (!iso) return 'Desconocida'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Desconocida'
  return new Intl.DateTimeFormat('es-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export const ENV_LABEL: Record<string, string> = { production: 'Producción', staging: 'Staging', local: 'Local' }
export const ENV_COLOR: Record<string, string> = { production: 'success', staging: 'warning', local: 'info' }

export const envLabel = (env: string | null): string => (env ? ENV_LABEL[env] ?? env : 'Desconocido')
export const envColor = (env: string | null): string => (env ? ENV_COLOR[env] ?? 'default' : 'default')
