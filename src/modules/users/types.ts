export type StaffRoleKey = 'superadmin' | 'support'

export interface UserRow {
  id: number
  name: string
  email: string
  phone: string | null
  staffRoles: StaffRoleKey[]
  eventsCount: number
  suspended: boolean
  anonymized: boolean
  lastAccessAt: string | null
  createdAt: string | null
}

export interface UserEventRef {
  id: number
  name: string
  slug: string | null
  role: string
  status: string | null
  published: boolean
  plan: string | null
}

export interface UserSession {
  loginTime: string | null
  logoutTime: string | null
  ip: string | null
  browser: string | null
  device: string | null
  location: string | null
}

export interface UserProfile {
  id: number
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  emailVerified: boolean
  staffRoles: StaffRoleKey[]
  createdAt: string | null
  anonymizedAt: string | null
  suspension: null | { at: string; by: { id: number; name: string; email: string } | null; reason: string | null }
  events: UserEventRef[]
  purchases: { paidCount: number; paidTotalCents: number; refundedCount: number; currency: string }
  recentSessions: UserSession[]
}

export interface UserFilters {
  search: string
  kind: 'staff' | 'customer' | null
  status: 'active' | 'suspended' | null
  internal: boolean
}
