import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

vi.mock('@/router', () => ({ default: { push: vi.fn(), hasRoute: () => true, currentRoute: { value: { name: 'Home' } } } }))
vi.mock('../store/currentUser', () => ({ useCurrentUserStore: () => ({ $reset: vi.fn() }) }))

import { API } from './axios'
import { reauthCancelled, reauthDone, reauthState } from './reauth'
import { markPaidByHand } from '@/modules/events/plan/planApi'

const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown): Promise<AxiosResponse> => {
  const res = { data, status, statusText: '', headers: {}, config } as AxiosResponse
  return status < 400 ? Promise.resolve(res) : Promise.reject(Object.assign(new Error('http'), { isAxiosError: true, config, response: res }))
}

const original = API.defaults.adapter
afterEach(() => { API.defaults.adapter = original })

describe('reauth_required on a sensitive action (manual payment)', () => {
  it('asks to confirm, then repeats the same request and returns its result', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    API.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
      calls.push(config)
      return calls.length === 1 ? reply(config, 403, { code: 'reauth_required' }) : reply(config, 200, { data: { id: 9 } })
    }) as AxiosAdapter

    const pending = markPaidByHand(5, 4900, 'Zelle', 'Pago recibido por Zelle')
    await vi.waitFor(() => expect(reauthState.open).toBe(true))
    reauthDone()

    await expect(pending).resolves.toEqual({ id: 9 })
    expect(calls).toHaveLength(2)
    expect(calls[1].url).toBe('payments/events/5/manual')
    expect(JSON.parse(calls[1].data)).toMatchObject({ amountCents: 4900, reason: 'Pago recibido por Zelle' })
  })

  it('cancelling the dialog rejects with reauthCancelled and does not repeat the request', async () => {
    let n = 0
    API.defaults.adapter = (async (config: InternalAxiosRequestConfig) => { n++; return reply(config, 403, { code: 'reauth_required' }) }) as AxiosAdapter

    const pending = markPaidByHand(5, 4900, '', 'Pago recibido por Zelle')
    await vi.waitFor(() => expect(reauthState.open).toBe(true))
    reauthCancelled()

    await expect(pending).rejects.toMatchObject({ reauthCancelled: true })
    expect(n).toBe(1)
  })

  it('does not loop when the repeated request is refused again', async () => {
    let n = 0
    API.defaults.adapter = (async (config: InternalAxiosRequestConfig) => { n++; return reply(config, 403, { code: 'reauth_required' }) }) as AxiosAdapter
    const pending = markPaidByHand(5, 4900, '', 'Pago recibido por Zelle')
    await vi.waitFor(() => expect(reauthState.open).toBe(true))
    reauthDone()
    await expect(pending).rejects.toBeTruthy()
    expect(n).toBe(2)
  })
})
