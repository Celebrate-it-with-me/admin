export type Probe = 'ok' | 'error' | 'unknown'

export interface FailedJobItem {
  id: number
  uuid: string
  job: string | null
  queue: string
  connection: string
  failedAt: string | null
  exceptionClass: string | null
  message: string
}
export interface FailedJobsReport {
  total: number
  last24h: number
  byQueue: { queue: string; total: number }[]
  items: FailedJobItem[]
}

export interface QueueRow { name: string; pending: number; delayed: number | null; reserved: number | null }
export interface QueuesReport {
  connection: string
  driver: string
  /** false: the driver cannot be read (sync, null...), so nothing below is known. */
  measurable: boolean
  error: string | null
  queues: QueueRow[]
  pendingTotal: number | null
  oldestPendingSeconds: number | null
  stalledSuspected: boolean | null
  worker: { status: 'unknown'; note: string }
  scheduler: { status: 'ok' | 'stale' | 'unknown'; lastBeatAt: string | null; secondsAgo: number | null }
}

export interface ErrorItem { level: 'error' | 'critical' | 'alert' | 'emergency'; at: string; message: string; count: number }
export interface ErrorsReport { available: boolean; file: string | null; items: ErrorItem[] }

export interface ConnectionItem { key: string; label: string; driver: string; status: Probe; latencyMs: number | null }

export interface ModuleFlag { key: string; section: string; isEnabled: boolean; plans: string[] }
export interface ModulesReport { total: number; enabled: number; disabled: number; items: ModuleFlag[] }
