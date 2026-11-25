import { API } from '@/services/axios'
import type { Coupon, LaunchOffer, LaunchOfferChanges, LaunchOfferResult, NewCoupon, Pricing, PurchaseDetail, PurchaseFilters, PurchasePage } from '../types'
import { buildParams } from '../logic'

/**
 * VITE_REVENUE_MOCK=true simulates the Stripe states of the contract (chargeback, disputes, needs-review, 502) in memory
 * while the API is not ready. Dev only: `import.meta.env.DEV` is statically false in the production build and the
 * dynamic import keeps ./mock out of the bundle.
 */
export const useMock = import.meta.env.DEV && import.meta.env.VITE_REVENUE_MOCK === 'true'
const loadMock = () => import('./mock')

export const fetchPurchases = async (f: PurchaseFilters, page: number, perPage: number): Promise<PurchasePage> => {
  if (useMock) return (await loadMock()).fetchPurchases(f, page, perPage)
  return (await API.get('revenue/purchases', { params: buildParams(f, page, perPage) })).data
}

export const fetchPurchase = async (id: number): Promise<PurchaseDetail> => {
  if (useMock) return (await loadMock()).fetchPurchase(id)
  return (await API.get(`revenue/purchases/${id}`)).data.data
}

/** Real refund on Stripe; a gateway failure is a 502 `gateway_error` and the purchase stays paid. */
export const refundPurchase = async (id: number, reason: string) => {
  if (useMock) return (await loadMock()).refundPurchase(id)
  return (await API.post(`payments/${id}/refund`, { reason })).data.data
}

/** Reconciles with Stripe (session, payment, refund, dispute). `admin.purchases.manage` + reauth (the interceptor asks). */
export const syncPurchase = async (id: number, reason: string) => {
  if (useMock) return (await loadMock()).syncPurchase(id)
  return (await API.post(`payments/${id}/sync`, { reason })).data.data
}

/** Clears `needsReview`. `admin.purchases.manage`. */
export const resolveReview = async (id: number, reason: string) => {
  if (useMock) return (await loadMock()).resolveReview(id)
  return (await API.post(`payments/${id}/resolve-review`, { reason })).data.data
}

export const fetchPricing = async (): Promise<Pricing> => (await API.get('revenue/pricing')).data.data

export const updatePrice = async (priceCents: number, reason: string) => (await API.put('payments/price', { priceCents, reason })).data.data

export const fetchCoupons = async (): Promise<Coupon[]> => (await API.get('payments/coupons')).data.data

export const createCoupon = async (c: NewCoupon, reason: string): Promise<Coupon> =>
  (await API.post('payments/coupons', { ...c, reason })).data.data

/** An absent key leaves the field alone; an explicit null removes the cap or the expiry. */
export const updateCoupon = async (id: number, changes: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }, reason: string): Promise<Coupon> =>
  (await API.patch(`payments/coupons/${id}`, { ...changes, reason })).data.data

/** `admin.pricing.manage`. `null` until the offer exists (the first PUT creates it). */
export const fetchLaunchOffer = async (): Promise<LaunchOffer | null> => (await API.get('payments/launch-offer')).data.data

/** `admin.pricing.manage` + reauth (the interceptor asks) + reason. Turning it off or changing the price closes the open checkouts. */
export const updateLaunchOffer = async (changes: LaunchOfferChanges, reason: string): Promise<LaunchOfferResult> =>
  (await API.put('payments/launch-offer', { ...changes, reason })).data.data
