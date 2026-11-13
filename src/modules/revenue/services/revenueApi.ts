import { API } from '@/services/axios'
import type { Coupon, NewCoupon, Pricing, PurchaseDetail, PurchaseFilters, PurchasePage } from '../types'
import { buildParams } from '../logic'

export const fetchPurchases = async (f: PurchaseFilters, page: number, perPage: number): Promise<PurchasePage> =>
  (await API.get('revenue/purchases', { params: buildParams(f, page, perPage) })).data

export const fetchPurchase = async (id: number): Promise<PurchaseDetail> => (await API.get(`revenue/purchases/${id}`)).data.data

export const refundPurchase = async (id: number, reason: string) => (await API.post(`payments/${id}/refund`, { reason })).data.data

export const fetchPricing = async (): Promise<Pricing> => (await API.get('revenue/pricing')).data.data

export const updatePrice = async (priceCents: number, reason: string) => (await API.put('payments/price', { priceCents, reason })).data.data

export const fetchCoupons = async (): Promise<Coupon[]> => (await API.get('payments/coupons')).data.data

export const createCoupon = async (c: NewCoupon, reason: string): Promise<Coupon> =>
  (await API.post('payments/coupons', { ...c, reason })).data.data

/** An absent key leaves the field alone; an explicit null removes the cap or the expiry. */
export const updateCoupon = async (id: number, changes: { isActive?: boolean; maxUses?: number | null; expiresAt?: string | null }, reason: string): Promise<Coupon> =>
  (await API.patch(`payments/coupons/${id}`, { ...changes, reason })).data.data
