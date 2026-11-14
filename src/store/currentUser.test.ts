import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const api = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn(), defaults: { headers: { common: {} as Record<string, string> } } }))
vi.mock('@/services/axios', () => ({ API: api }))

import { useCurrentUserStore } from './currentUser'

describe('currentUser store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    api.post.mockReset()
    api.get.mockReset()
    api.defaults.headers.common = {}
  })

  describe('can', () => {
    it('allows an action that needs no permission', () => {
      expect(useCurrentUserStore().can(undefined)).toBe(true)
    })
    it('allows only what the user has', () => {
      const store = useCurrentUserStore()
      store.user = { email: 'a@b.c', permissions: ['admin.users.view'] }
      expect(store.can('admin.users.view')).toBe(true)
      expect(store.can('admin.team.manage')).toBe(false)
      expect(store.hasPermissionTo('admin.users.view')).toBe(true)
    })
    it('denies when there is no user yet', () => {
      expect(useCurrentUserStore().can('admin.users.view')).toBe(false)
    })
  })

  describe('isLoaded', () => {
    it('depends on the email', () => {
      const store = useCurrentUserStore()
      expect(store.isLoaded).toBe(false)
      store.user = { email: 'a@b.c' }
      expect(store.isLoaded).toBe(true)
    })
  })

  describe('login', () => {
    it('saves the token, sets the header and loads the user', async () => {
      api.post.mockResolvedValue({ data: 'tok123' })
      api.get.mockResolvedValue({ data: { data: { email: 'a@b.c', permissions: ['x'] } } })
      const store = useCurrentUserStore()
      await store.login('a@b.c', 'pw', 'laptop')
      expect(api.post).toHaveBeenCalledWith('login', { email: 'a@b.c', password: 'pw', device: 'laptop' })
      expect(localStorage.getItem('token')).toBe('tok123')
      expect(api.defaults.headers.common).toEqual({ Authorization: 'Bearer tok123' })
      expect(store.user.email).toBe('a@b.c')
      expect(store.userPermissions).toEqual(['x'])
    })
    it('returns the error instead of throwing (the form shows it)', async () => {
      const error = new Error('bad credentials')
      api.post.mockRejectedValue(error)
      expect(await useCurrentUserStore().login('a', 'b', 'c')).toBe(error)
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('getUser', () => {
    it('accepts a resource without the data wrapper', async () => {
      api.get.mockResolvedValue({ data: { email: 'plain@b.c', permissions: [] } })
      const store = useCurrentUserStore()
      await store.getUser()
      expect(store.user.email).toBe('plain@b.c')
    })
    it('resets and drops the token when the request fails', async () => {
      localStorage.setItem('token', 'old')
      api.get.mockRejectedValue(new Error('401'))
      const store = useCurrentUserStore()
      store.user = { email: 'a@b.c' }
      await store.getUser()
      expect(store.isLoaded).toBe(false)
      expect(localStorage.getItem('token')).toBeNull()
    })
  })

  describe('ensureLoaded', () => {
    it('does nothing without a saved token', async () => {
      await useCurrentUserStore().ensureLoaded()
      expect(api.get).not.toHaveBeenCalled()
    })
    it('loads the user when there is a token', async () => {
      localStorage.setItem('token', 't')
      api.get.mockResolvedValue({ data: { data: { email: 'a@b.c' } } })
      const store = useCurrentUserStore()
      await store.ensureLoaded()
      expect(api.get).toHaveBeenCalledWith('userInfo')
      expect(store.isLoaded).toBe(true)
    })
    it('does not ask again once loaded', async () => {
      localStorage.setItem('token', 't')
      const store = useCurrentUserStore()
      store.user = { email: 'a@b.c' }
      await store.ensureLoaded()
      expect(api.get).not.toHaveBeenCalled()
    })
  })

  it('logout clears the user and the token', async () => {
    localStorage.setItem('token', 't')
    const store = useCurrentUserStore()
    store.user = { email: 'a@b.c' }
    api.post.mockResolvedValue({})
    await store.logout()
    expect(api.post).toHaveBeenCalledWith('account/logout')
    expect(store.isLoaded).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })
})
