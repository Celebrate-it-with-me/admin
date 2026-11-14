import { API } from '@/services/axios'
import type { AccountProfile, AccountSession, ActivityEntry, Page, TwoFactorSetup, TwoFactorStatus } from '../types'

/** Everything here works on the logged-in person only: there is no user id in any call. */
export const fetchProfile = async (): Promise<AccountProfile> => (await API.get('account')).data.data
export const updateProfile = async (body: { name?: string; language?: string }): Promise<AccountProfile> => (await API.patch('account/profile', body)).data.data

export const requestEmailChange = async (email: string, password: string): Promise<AccountProfile> => (await API.post('account/email', { email, password })).data.data
export const confirmEmailChange = async (token: string): Promise<AccountProfile> => (await API.post('account/email/confirm', { token })).data.data
export const cancelEmailChange = async (): Promise<AccountProfile> => (await API.delete('account/email')).data.data

export const changePassword = async (body: { currentPassword: string; newPassword: string; newPasswordConfirmation: string }): Promise<{ sessionsClosed: number }> =>
  (await API.post('account/password', body)).data.data

export const startTwoFactor = async (password: string): Promise<TwoFactorSetup> => (await API.post('account/two-factor/setup', { password })).data.data
export const confirmTwoFactor = async (code: string): Promise<{ recoveryCodes: string[] } & TwoFactorStatus> => (await API.post('account/two-factor/confirm', { code })).data.data
export const regenerateRecoveryCodes = async (password: string): Promise<{ recoveryCodes: string[] } & TwoFactorStatus> => (await API.post('account/two-factor/recovery-codes', { password })).data.data
export const disableTwoFactor = async (password: string): Promise<TwoFactorStatus> => (await API.post('account/two-factor/disable', { password })).data.data

export const fetchSessions = async (): Promise<AccountSession[]> => (await API.get('account/sessions')).data.data
export const closeSession = async (id: number): Promise<void> => { await API.delete(`account/sessions/${id}`) }
export const closeOtherSessions = async (): Promise<number> => (await API.delete('account/sessions')).data.data.closed
export const logoutAll = async (): Promise<void> => { await API.post('account/logout-all') }
export const fetchActivity = async (page = 1): Promise<Page<ActivityEntry>> => (await API.get('account/activity', { params: { page, perPage: 10 } })).data
