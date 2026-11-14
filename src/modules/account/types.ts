export interface TwoFactorStatus {
  enabled: boolean
  confirmedAt: string | null
  recoveryCodesRemaining: number
  /** The server requires it for this role (superadmin, when ADMIN_REQUIRE_2FA_SUPERADMIN is on). */
  required: boolean
}

export interface AccountProfile {
  id: number
  name: string
  email: string
  roles: string[]
  language: 'es' | 'en'
  createdAt: string | null
  passwordChangedAt: string | null
  pendingEmail: { email: string; expiresAt: string } | null
  twoFactor: TwoFactorStatus
}

export interface AccountSession {
  id: number
  current: boolean
  device: string
  name: string
  client: string | null
  ip: string | null
  lastUsedAt: string | null
  createdAt: string | null
}

export interface ActivityEntry {
  id: number
  action: string
  createdAt: string
  ip: string | null
  device: string
  detail: Record<string, string | number>
}

export interface Page<T> {
  data: T[]
  meta: { page: number; perPage: number; total: number; lastPage: number }
}

export interface TwoFactorSetup {
  secret: string
  otpauthUrl: string
}
