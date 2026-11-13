// Shared types for the admin app.

/** Shape of the error body returned by the API (e.g. `{ data: { message } }`). */
export interface ApiErrorResponse {
  data: { message: string }
}

export interface PartyMember {
  name: string
  confirmed: number
}

export interface MainGuestItem {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  confirmed: string
  partyMembers: PartyMember[]
}

export interface UserItem {
  id?: number
  name: string
  email: string
}

export interface CurrentUser {
  name?: string
  email?: string
  permissions?: string[]
  [key: string]: unknown
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
