import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }))
vi.mock('@/services/axios', () => ({ API: http }))
const { disableTwoFactor } = await import('./accountApi')

beforeEach(() => { Object.values(http).forEach(fn => fn.mockReset()) })

describe('accountApi', () => {
  it('disables two-factor with the current password and a code', async () => {
    http.post.mockResolvedValue({ data: { data: { enabled: false } } })
    expect(await disableTwoFactor('secret-pass', '123456')).toEqual({ enabled: false })
    expect(http.post).toHaveBeenCalledWith('account/two-factor/disable', { password: 'secret-pass', code: '123456' })
  })
})
