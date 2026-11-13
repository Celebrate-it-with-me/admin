export type SupportStatus = 'new' | 'in_progress' | 'resolved'

export interface Person { id: number; name: string; email: string }
export interface Staff { id: number; name: string }
export interface EventRef { id: number; name: string }

export interface SupportRow {
  id: number
  message: string
  status: SupportStatus
  user: Person | null
  event: EventRef | null
  assignedTo: Staff | null
  notesCount: number
  createdAt: string
  resolvedAt: string | null
}

export interface SupportNote { id: number; body: string; author: Staff | null; createdAt: string }

export interface SupportDetail {
  id: number
  message: string
  status: SupportStatus
  context: Record<string, string | number | null>
  user: (Person & { adminPath: string }) | null
  event: (EventRef & { adminPath: string }) | null
  assignedTo: Staff | null
  notes: SupportNote[]
  createdAt: string
  resolvedAt: string | null
}

export type StatusCounts = Record<SupportStatus, number>
export type AssignFilter = 'all' | 'me' | 'none'
