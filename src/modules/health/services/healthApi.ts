import { API } from '@/services/axios'
import type { ConnectionItem, ErrorsReport, FailedJobsReport, ModulesReport, QueuesReport } from '../types'

export const fetchFailedJobs = async (limit = 20): Promise<FailedJobsReport> => (await API.get('health/failed-jobs', { params: { limit } })).data
export const fetchQueues = async (): Promise<QueuesReport> => (await API.get('health/queues')).data
export const fetchErrors = async (limit = 20): Promise<ErrorsReport> => (await API.get('health/errors', { params: { limit } })).data
export const fetchConnections = async (): Promise<ConnectionItem[]> => (await API.get('health/connections')).data.items
export const fetchModules = async (): Promise<ModulesReport> => (await API.get('health/modules')).data
