export type PurchaseStatus = 'pending' | 'paid' | 'refunded' | 'failed' | 'chargeback'
export type Gateway = 'fake' | 'stripe' | 'manual'

/** Stripe dispute states; the API may send others, so the label lookup has a fallback. */
export type DisputeStatus =
  | 'warning_needs_response' | 'warning_under_review' | 'warning_closed'
  | 'needs_response' | 'under_review' | 'charge_refunded' | 'won' | 'lost'

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
  disputeStatus: DisputeStatus | string | null
  needsReview: boolean
}

export interface TimelineStep { type: 'created' | 'paid' | 'refunded'; at: string | null; by: Person | null }

export interface PurchaseCreditNote { id: number; number: string; amountCents: number; currency: string; issuedAt: string }
export interface PurchaseInvoice { id: number; number: string; status: 'issued' | 'void'; creditNotes: PurchaseCreditNote[] }

export interface PurchaseDetail extends PurchaseRow {
  plan: { slug: string; name: string } | null
  eventSlug: string | null
  coupon: { id: number; code: string; kind: string; value: number; isFounder: boolean } | null
  discountCents: number
  registeredBy: Person | null
  notes: string | null
  receiptUrl: string | null
  gatewayRef: string | null
  gatewayPaymentId: string | null
  gatewayRefundId: string | null
  failureCode: string | null
  disputeId: string | null
  disputedAt: string | null
  taxCents: number
  /** Link to the payment in the Stripe dashboard; only when gateway is stripe. */
  stripeUrl: string | null
  timeline: TimelineStep[]
  invoices: PurchaseInvoice[]
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
  disputed: boolean
  needsReview: boolean
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
