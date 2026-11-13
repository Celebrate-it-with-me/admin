export interface PlanOption { slug: string; name: string; limit: number | null }

export interface EventPurchaseRow {
  id: number
  status: string
  gateway: string | null
  plan: { slug: string; name: string } | null
  listPriceCents: number | null
  amountCents: number | null
  currency: string | null
  coupon: string | null
  isFounder: boolean
  notes: string | null
  buyer: { id: number; name: string } | null
  registeredBy: { id: number; name: string } | null
  paidAt: string | null
  refundedAt: string | null
  createdAt: string | null
  refundable: boolean
  refundBlockedReason: 'not_paid' | 'event_published' | null
}

export type PlanWarning =
  | { code: 'guests_over_limit'; limit: number; guests: number; published: boolean }
  | { code: 'modules_locked'; modules: string[] }
  | { code: 'paid_purchase_exists' }

export interface PlanChangeResult {
  plan: { id: number; slug: string; name: string; guestLimit: number | null }
  warnings: PlanWarning[]
  modulesLocked: string[]
  modulesUnlocked: string[]
}
