export type ItemType = 'comment' | 'image'
export type ItemStatus = 'visible' | 'hidden' | 'pending_review'
export type BulkAction = 'hide' | 'restore' | 'delete'

export interface ModerationItem {
  type: ItemType
  id: number
  event: { id: number; name: string }
  author: { type: 'guest' | 'user'; id: number; name: string } | null
  content: { text: string | null; thumbnailUrl: string | null; imageUrl: string | null }
  status: ItemStatus
  createdAt: string
  hiddenAt: string | null
  hiddenBy: { id: number; name: string } | null
  pinned?: boolean
}

export interface ModerationFilters {
  type: ItemType | null
  status: 'visible' | 'hidden' | null
  eventId: string
  from: string
  to: string
  search: string
}

export interface BulkResult {
  type: ItemType
  id: number
  ok: boolean
  changed: boolean
  error: { code: string; message: string } | null
}

export interface BulkResponse {
  action: BulkAction
  succeeded: number
  failed: number
  results: BulkResult[]
}
