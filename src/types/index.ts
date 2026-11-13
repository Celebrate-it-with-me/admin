// Shared types for the admin app.

export type StaffRole = 'superadmin' | 'support'

export interface CurrentUser {
  id?: number
  name?: string
  email?: string
  roles?: StaffRole[]
  permissions?: string[]
  [key: string]: unknown
}

export interface TeamMember {
  id: number
  name: string
  email: string
  role: StaffRole | null
  createdAt: string | null
}

export interface AuditEntry {
  id: number
  action: string
  createdAt: string
  actor: { id: number; name: string; email: string } | null
  subjectType: string | null
  subjectId: number | null
  event: { id: number; name: string | null } | null
  user: { id: number; name: string | null; email: string | null } | null
  reason: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  impersonatedBy: number | null
  ip: string | null
}

export interface MetricPair {
  value: number
  previous: number
  change: number
}

export interface AttentionItem {
  type: 'stuck_purchases' | 'over_free_limit' | 'upcoming_draft' | 'coupons_ending'
  count: number
  examples: { eventId?: number; label?: string; status?: string; used?: number; max?: number | null }[]
}

export interface DashboardData {
  days: number
  includeInternal: boolean
  generatedAt: string
  kpis: Record<'signups' | 'eventsCreated' | 'published' | 'paid' | 'revenueCents' | 'refundedCents', MetricPair>
  series: DashboardCharts['series']
  mix: DashboardCharts['mix']
  upcomingWeeks: DashboardCharts['upcomingWeeks']
  funnel: { key: 'signups' | 'event' | 'guests' | 'published' | 'paid'; count: number }[]
  usage: { guests: number; attending: number; answered: number; answerRate: number; upcoming: number; upcomingDraft: number; liveEvents: number }
  attention: AttentionItem[]
}

export type SeriesKey = 'signups' | 'eventsCreated' | 'published' | 'paid' | 'revenueCents'

export interface DashboardCharts {
  series: { dates: string[]; metrics: Record<SeriesKey, { current: number[]; previous: number[] }> }
  mix: { type: { key: string; count: number }[]; plan: { key: string; count: number }[]; stage: { key: string; count: number }[] }
  upcomingWeeks: { weekStart: string; published: number; draft: number }[]
}
