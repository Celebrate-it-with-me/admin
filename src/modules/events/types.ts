export type EventStatus = 'draft' | 'published' | 'archived'
export type EventStage = 'save_the_date' | 'invitation'

export interface EventRow {
  id: number
  name: string
  slug: string | null
  type: { slug: string; name: string } | null
  plan: { slug: string; name: string } | null
  status: EventStatus
  stage: EventStage
  startDate: string | null
  owner: { id: number; name: string; email: string } | null
  guestCount: number
  lastPurchaseStatus: string | null
  createdAt: string
}

export interface EventListMeta { page: number; perPage: number; total: number; lastPage: number; hiddenInternal?: number }

export interface EventFilters {
  search: string
  status: EventStatus | null
  stage: EventStage | null
  plan: string | null
  type: string | null
  from: string
  to: string
  paymentPending: boolean
  internal: boolean
  sort: 'createdAt' | 'startDate'
}

export interface Purchase {
  id: number
  status: string
  gateway: string | null
  plan: string | null
  listPriceCents: number | null
  amountCents: number | null
  currency: string | null
  isFounder: boolean
  paidAt: string | null
  refundedAt: string | null
  createdAt: string | null
}

export interface EventExpenses { items: number; total: number; paid: number; cap: number | null; currency: string }

export interface EventDetail {
  event: {
    id: number; name: string; description: string | null; slug: string | null; slugLocked: boolean
    type: { id: number; slug: string; name: string } | null
    status: EventStatus; stage: EventStage
    startDate: string | null; endDate: string | null; publishedAt: string | null
    locale: string | null; timezone: string | null; currency: string | null
    createdAt: string | null; updatedAt: string | null; deletedAt: string | null
  }
  owner: { id: number; name: string; email: string } | null
  collaborators: { id: number; name: string; email: string; role: string }[]
  plan: { id: number; slug: string; name: string; guestLimit: number | null; priceCents: number | null } | null
  /** null for roles that cannot see payments (support). */
  payment: { lastPurchase: Purchase | null; purchases: Purchase[] } | null
  publicLink: { isLive: boolean; url: string | null; pattern: string | null }
  counts: { guests: number; attending: number; notAttending: number; pending: number; expenses: EventExpenses | null }
  modules: { key: string; section: string; state: 'active' | 'locked' }[]
  recentActivity: { id: number; type: string; message: string; actorName: string | null; createdAt: string }[]
}
