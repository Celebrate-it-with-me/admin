export type PurchaseStatus = 'pending' | 'paid' | 'refunded' | 'failed'
export type Gateway = 'fake' | 'stripe' | 'manual'

export interface Person { id: number; name: string; email: string }

export interface PurchaseRow {
  id: number
  event: { id: number; name: string; status: string } | null
  buyer: Person | null
  couponCode: string | null
  gateway: Gateway
  status: PurchaseStatus
  isFounder: boolean
  listPriceCents: number
  amountCents: number
  currency: string
  paidAt: string | null
  refundedAt: string | null
  createdAt: string | null
  canRefund: boolean
}

export interface TimelineStep { type: 'created' | 'paid' | 'refunded'; at: string | null; by: Person | null }

export interface PurchaseDetail extends PurchaseRow {
  plan: { slug: string; name: string } | null
  eventSlug: string | null
  coupon: { id: number; code: string; kind: string; value: number; isFounder: boolean } | null
  discountCents: number
  registeredBy: Person | null
  notes: string | null
  receiptUrl: string | null
  gatewayRef: string | null
  timeline: TimelineStep[]
}

export interface Summary { count: number; paidCount: number; revenueCents: number; refundedCount: number; refundedCents: number }

export interface PurchasePage {
  data: PurchaseRow[]
  meta: { page: number; perPage: number; total: number; lastPage: number }
  summary: Summary
}

export interface PurchaseFilters {
  search: string
  status: PurchaseStatus | null
  gateway: Gateway | null
  founder: 'yes' | 'no' | null
  coupon: string
  paidFrom: string
  paidTo: string
  createdFrom: string
  createdTo: string
}

export interface Pricing {
  plan: { slug: string; name: string; priceCents: number; currency: string; maxGuests: number }
  purchases: { total: number; paid: number }
  coupons: { total: number; active: number }
}

/** The payments API returns the coupon model as is (snake_case). */
export interface Coupon {
  id: number
  code: string
  kind: 'fixed_price' | 'percent_off'
  value: number
  is_founder: boolean
  max_uses: number | null
  times_used: number
  expires_at: string | null
  is_active: boolean
  notes: string | null
}

export interface NewCoupon {
  code: string
  kind: 'fixed_price' | 'percent_off'
  value: number
  isFounder: boolean
  maxUses: number | null
  expiresAt: string | null
  notes: string | null
}
