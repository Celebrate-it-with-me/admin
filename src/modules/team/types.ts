import type { StaffRole } from '@/types'

/** Docs: docs/plans/admin-team-contract.md (binding contract with the API). */
export type MemberStatus = 'active' | 'invited' | 'suspended'

export interface Invitation {
  sentAt: string
  expiresAt: string
  resendCount: number
  expired: boolean
}

export interface Member {
  id: number
  name: string
  email: string
  role: StaffRole
  status: MemberStatus
  lastLoginAt: string | null
  twoFactorEnabled: boolean
  /** Only when `status` is `invited`. */
  invitation: Invitation | null
}

export interface InviteBody {
  email: string
  name?: string
  role: StaffRole
  reason: string
}

/** Actions a row can offer, according to the member's status. */
export type ActionKey = 'resend' | 'revoke' | 'role' | 'suspend' | 'reactivate' | 'twofactor' | 'remove'

export interface MemberAction {
  key: ActionKey
  label: string
  icon: string
  danger?: boolean
  disabled?: boolean
  /** Why it is disabled (or a note). */
  hint?: string
}

export interface StatusView {
  label: string
  color: string
  icon: string
  /** Second line under the chip ("vence en 2 días", "Vencida"). */
  note: string
  noteTone: 'muted' | 'error'
}

export interface TeamFilters {
  search: string
  status: MemberStatus | null
  role: StaffRole | null
}

/** GET invitations/{token}. */
export interface InvitationPreview {
  name: string
  email: string
  role: StaffRole
  expiresAt: string
  accountExists: boolean
  requiresTwoFactor: boolean
}

/** POST invitations/{token}/accept body (snake_case, as Laravel reads it). */
export interface AcceptBody {
  name?: string
  password: string
  password_confirmation: string
  current_password?: string
}

/**
 * What accepting gives back. Normal case: the session token, whether she must set up two-factor, and the user. Rare case
 * (an account that already had admin two-factor): no `data`, a challenge to answer with the login's second step.
 */
export type AcceptResult =
  | { kind: 'session'; token: string; twoFactorSetupRequired: boolean }
  | { kind: 'challenge'; challenge: string }

export type InviteLoadState = 'loading' | 'ready' | 'invalid' | 'expired' | 'network' | 'error'
