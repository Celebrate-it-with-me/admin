import { API } from '@/services/axios'
import type { ConnectionItem, ErrorsReport, FailedJobsReport, MaintenanceState, ModulesReport, QueuesReport, RetryQueueResult } from '../types'

export const fetchFailedJobs = async (limit = 20): Promise<FailedJobsReport> => (await API.get('health/failed-jobs', { params: { limit } })).data
export const fetchQueues = async (): Promise<QueuesReport> => (await API.get('health/queues')).data
export const fetchErrors = async (limit = 20): Promise<ErrorsReport> => (await API.get('health/errors', { params: { limit } })).data
export const fetchConnections = async (): Promise<ConnectionItem[]> => (await API.get('health/connections')).data.items
export const fetchModules = async (): Promise<ModulesReport> => (await API.get('health/modules')).data

// Actions (permission admin.system.manage). The reason is required (>= 5 characters) and goes to the audit log.
export const retryFailedJob = async (uuid: string, reason: string): Promise<void> => { await API.post(`health/failed-jobs/${uuid}/retry`, { reason }) }
export const deleteFailedJob = async (uuid: string, reason: string): Promise<void> => { await API.delete(`health/failed-jobs/${uuid}`, { data: { reason } }) }
export const retryFailedQueue = async (queue: string, reason: string): Promise<RetryQueueResult> => (await API.post('health/failed-jobs/retry', { queue, reason })).data

export const fetchMaintenance = async (): Promise<MaintenanceState> => (await API.get('system/maintenance')).data
export const setMaintenance = async (body: { active: boolean; message?: string | null; estimatedEnd?: string | null; reason: string }): Promise<MaintenanceState> =>
  (await API.put('system/maintenance', body)).data
