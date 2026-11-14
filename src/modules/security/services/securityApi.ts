import { API } from '@/services/axios'
import type { SecurityState } from '../types'

// Both need admin.security.manage (superadmin). Changing it asks for a recent re-authentication (the axios interceptor
// opens the dialog and repeats the request) and a reason of at least 5 characters, which goes to the audit log.
export const fetchSecurity = async (): Promise<SecurityState> => (await API.get('system/security')).data
export const setRequireTwoFactor = async (enabled: boolean, reason: string): Promise<SecurityState> =>
  (await API.put('system/security', { enabled, reason })).data
