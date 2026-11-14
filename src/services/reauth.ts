import { reactive } from 'vue'

/**
 * Step-up re-authentication. The API answers 403 `{code: 'reauth_required'}` to a very sensitive action when the
 * person has not confirmed her password (and 2FA code) in the last minutes. The axios interceptor calls `askReauth()`,
 * which opens the global ReauthDialog and resolves once she confirms, and the interceptor then retries the original
 * request. Several requests failing at the same time share one dialog.
 */
export const reauthState = reactive({ open: false })

let pending: Promise<void> | null = null
let resolveFn: (() => void) | null = null
let rejectFn: (() => void) | null = null

export const askReauth = (): Promise<void> => {
  if (pending) return pending
  pending = new Promise<void>((resolve, reject) => { resolveFn = resolve; rejectFn = reject })
  reauthState.open = true
  return pending
}

const settle = (ok: boolean) => {
  const fn = ok ? resolveFn : rejectFn
  pending = null
  resolveFn = null
  rejectFn = null
  reauthState.open = false
  fn?.()
}

export const reauthDone = () => settle(true)
export const reauthCancelled = () => settle(false)
