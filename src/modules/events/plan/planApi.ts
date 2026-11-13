import { API } from '@/services/axios'
import type { EventPurchaseRow, PlanChangeResult } from './types'

export async function fetchPurchases(eventId: number): Promise<{ data: EventPurchaseRow[]; eventStatus: string }> {
  return (await API.get(`events/${eventId}/purchases`)).data
}

export async function markPaidByHand(eventId: number, amountCents: number, notes: string, reason: string) {
  return (await API.post(`payments/events/${eventId}/manual`, { amountCents, notes: notes || undefined, reason })).data.data
}

export async function refundPurchase(purchaseId: number, reason: string) {
  return (await API.post(`payments/${purchaseId}/refund`, { reason })).data.data
}

export async function changePlan(eventId: number, planSlug: string, reason: string): Promise<PlanChangeResult> {
  return (await API.patch(`events/${eventId}/plan`, { planSlug, reason })).data.data
}
