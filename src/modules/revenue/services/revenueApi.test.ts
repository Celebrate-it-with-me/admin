import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
vi.mock('./mock', () => ({}))

// A developer's .env.local may switch the mock on; these tests are about the real client.
vi.stubEnv('VITE_REVENUE_MOCK', 'false')
const api = await import('./revenueApi')
const { emptyFilters } = await import('../logic')

beforeEach(() => { Object.values(http).forEach(fn => fn.mockReset()) })

describe('revenueApi', () => {
  it('lists with the new filters', async () => {
    http.get.mockResolvedValue({ data: { data: [], meta: {}, summary: {} } })
    await api.fetchPurchases({ ...emptyFilters(), disputed: true, needsReview: true }, 1, 15)
    expect(http.get).toHaveBeenCalledWith('revenue/purchases', { params: expect.objectContaining({ disputed: 1, needsReview: 1 }) })
  })

  it('refunds with the reason', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 1 } } })
    expect(await api.refundPurchase(1, 'duplicado')).toEqual({ id: 1 })
    expect(http.post).toHaveBeenCalledWith('payments/1/refund', { reason: 'duplicado' })
  })

  it('syncs with Stripe', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 3 } } })
    await api.syncPurchase(3, 'webhook perdido')
    expect(http.post).toHaveBeenCalledWith('payments/3/sync', { reason: 'webhook perdido' })
  })

  it('marks a purchase as reviewed', async () => {
    http.post.mockResolvedValue({ data: { data: { id: 4 } } })
    await api.resolveReview(4, 'revisado en Stripe')
    expect(http.post).toHaveBeenCalledWith('payments/4/resolve-review', { reason: 'revisado en Stripe' })
  })

  it('lets a gateway error through to the caller', async () => {
    const err = { response: { status: 502, data: { code: 'gateway_error' } } }
    http.post.mockRejectedValue(err)
    await expect(api.refundPurchase(1, 'motivo')).rejects.toBe(err)
  })
})

describe('launch offer', () => {
  it('reads the offer, which may not exist yet', async () => {
    http.get.mockResolvedValue({ data: { data: null } })
    expect(await api.fetchLaunchOffer()).toBeNull()
    expect(http.get).toHaveBeenCalledWith('payments/launch-offer')
  })

  it('updates with the reason', async () => {
    http.put.mockResolvedValue({ data: { data: { id: 1, sessionsClosed: 0 } } })
    await api.updateLaunchOffer({ isActive: false }, 'pausa')
    expect(http.put).toHaveBeenCalledWith('payments/launch-offer', { isActive: false, reason: 'pausa' })
  })
})
