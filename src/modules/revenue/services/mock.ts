/**
 * In-memory simulation of the Stripe checkout contract (admin side), for developing the screens before the API is ready.
 * Switched on with VITE_REVENUE_MOCK=true in dev; loaded dynamically, so it is not part of the production bundle.
 *
 * Try: refund #2 fails with 502 gateway_error the first time (then works); "sync" on #5 clears nothing but answers;
 * #4 and #6 start with needsReview; #3 is a lost dispute (chargeback); #7 an open dispute.
 */
import type { PurchaseDetail, PurchaseFilters, PurchasePage, PurchaseRow, Summary } from '../types'

const person = (id: number, name: string) => ({ id, name, email: `${name.split(' ')[0].toLowerCase()}@example.com` })
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

function make(id: number, over: Partial<PurchaseDetail>): PurchaseDetail {
  const base: PurchaseDetail = {
    id,
    event: { id: 100 + id, name: `Los XV de Camila ${id}`, status: 'draft' },
    buyer: person(id, `Compradora ${id}`),
    couponCode: null,
    gateway: 'stripe',
    status: 'paid',
    isFounder: false,
    listPriceCents: 9900,
    amountCents: 9900,
    currency: 'USD',
    paidAt: ago(3),
    refundedAt: null,
    createdAt: ago(3),
    canRefund: true,
    disputeStatus: null,
    needsReview: false,
    plan: { slug: 'complete', name: 'Completo' },
    eventSlug: `xv-camila-${id}`,
    coupon: null,
    discountCents: 0,
    registeredBy: null,
    notes: null,
    receiptUrl: null,
    gatewayRef: `cs_test_${id}`,
    gatewayPaymentId: `pi_test_${id}`,
    gatewayRefundId: null,
    failureCode: null,
    disputeId: null,
    disputedAt: null,
    taxCents: 0,
    stripeUrl: `https://dashboard.stripe.com/test/payments/pi_test_${id}`,
    timeline: [{ type: 'created', at: ago(3), by: null }, { type: 'paid', at: ago(3), by: null }],
    invoices: [],
  }
  return { ...base, ...over }
}

const data: PurchaseDetail[] = [
  make(1, {}),
  make(2, { event: { id: 102, name: 'Boda de Lucía y Marco', status: 'draft' } }),
  make(3, { status: 'chargeback', disputeStatus: 'lost', disputeId: 'dp_test_3', disputedAt: ago(20), canRefund: false }),
  make(4, { needsReview: true, event: { id: 104, name: 'Los XV de Valentina', status: 'published' }, canRefund: false, status: 'refunded', refundedAt: ago(1), gatewayRefundId: 're_test_4' }),
  make(5, { status: 'pending', paidAt: null }),
  make(6, { needsReview: true, status: 'chargeback', disputeStatus: 'lost', disputeId: 'dp_test_6', disputedAt: ago(30), event: { id: 106, name: 'Boda de Ana', status: 'published' }, canRefund: false }),
  make(7, { disputeStatus: 'needs_response', disputeId: 'dp_test_7', disputedAt: ago(2) }),
  make(8, { gateway: 'manual', gatewayRef: null, gatewayPaymentId: null, stripeUrl: null }),
  make(9, { status: 'failed', paidAt: null, failureCode: 'expired' }),
]

let refundFailsOnce = true
const wait = (ms = 250) => new Promise(r => setTimeout(r, ms))
const find = (id: number) => {
  const p = data.find(d => d.id === id)
  if (!p) throw { response: { status: 404, data: { message: 'No encontrada.', code: 'not_found' } } }
  return p
}
const row = (p: PurchaseDetail): PurchaseRow => ({
  id: p.id, event: p.event, buyer: p.buyer, couponCode: p.couponCode, gateway: p.gateway, status: p.status, isFounder: p.isFounder,
  listPriceCents: p.listPriceCents, amountCents: p.amountCents, currency: p.currency, paidAt: p.paidAt, refundedAt: p.refundedAt,
  createdAt: p.createdAt, canRefund: p.canRefund, disputeStatus: p.disputeStatus, needsReview: p.needsReview,
})

export async function fetchPurchases(f: PurchaseFilters, page: number, perPage: number): Promise<PurchasePage> {
  await wait()
  const q = f.search.trim().toLowerCase()
  const list = data.filter(p =>
    (!f.status || p.status === f.status) &&
    (!f.gateway || p.gateway === f.gateway) &&
    (!f.disputed || p.disputeStatus !== null) &&
    (!f.needsReview || p.needsReview) &&
    (!q || (p.event?.name.toLowerCase().includes(q) ?? false) || (p.buyer?.email.includes(q) ?? false)))
  const paid = list.filter(p => p.status === 'paid')
  const refunded = list.filter(p => p.status === 'refunded')
  const summary: Summary = {
    count: list.length, paidCount: paid.length, revenueCents: paid.reduce((n, p) => n + p.amountCents, 0),
    refundedCount: refunded.length, refundedCents: refunded.reduce((n, p) => n + p.amountCents, 0),
  }
  return {
    data: list.slice((page - 1) * perPage, page * perPage).map(row),
    meta: { page, perPage, total: list.length, lastPage: Math.max(1, Math.ceil(list.length / perPage)) },
    summary,
  }
}

export async function fetchPurchase(id: number): Promise<PurchaseDetail> {
  await wait()
  return structuredClone(find(id))
}

export async function refundPurchase(id: number) {
  await wait(500)
  const p = find(id)
  if (p.status !== 'paid') throw { response: { status: 422, data: { message: 'x', errors: { purchase: ['not_paid'] } } } }
  if (p.event?.status === 'published') throw { response: { status: 422, data: { message: 'x', errors: { purchase: ['event_published'] } } } }
  if (p.id === 2 && refundFailsOnce) {
    refundFailsOnce = false
    throw { response: { status: 502, data: { message: 'Stripe is down', code: 'gateway_error' } } }
  }
  p.status = 'refunded'
  p.refundedAt = new Date().toISOString()
  p.gatewayRefundId = `re_test_${id}`
  p.canRefund = false
  p.timeline.push({ type: 'refunded', at: p.refundedAt, by: null })
  return { id, status: p.status }
}

export async function syncPurchase(id: number) {
  await wait(500)
  const p = find(id)
  if (p.gateway !== 'stripe') throw { response: { status: 409, data: { message: 'x', code: 'not_stripe' } } }
  if (p.status === 'pending') { p.status = 'paid'; p.paidAt = new Date().toISOString() }
  return { id, status: p.status }
}

export async function resolveReview(id: number) {
  await wait()
  const p = find(id)
  if (!p.needsReview) throw { response: { status: 409, data: { message: 'x', code: 'not_needs_review' } } }
  p.needsReview = false
  return { id, needsReview: false }
}
