export type Environment = 'local' | 'staging' | 'production'

/** GET /api/v1/admin/system/version (staff only). */
export interface ApiVersion {
  version: string
  commit: string
  builtAt: string
  environment: Environment | string
  php: string
  laravel: string
}

/** {VITE_APP_URL}/version.json of the app and /version.json of this admin. */
export interface StaticVersion {
  name: string
  version: string
  commit: string
  builtAt: string
}

export type ServiceKey = 'api' | 'app' | 'admin'

/** What a card shows, whichever service it came from. Missing pieces are null, never invented. */
export interface VersionInfo {
  version: string | null
  commit: string | null
  builtAt: string | null
  environment: string | null
  php: string | null
  laravel: string | null
}
