/** Shapes of admin/whatsapp (contract: docs/plans/communications-contract.md). Responses are camelCase, bodies snake_case. */

export type TemplateKey = 'invitation' | 'save_the_date' | 'reminder_pending' | 'rsvp_confirmation' | 'padrino_reminder'
export type Locale = 'es' | 'en'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type TemplateStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'paused'
export type TemplateCategory = 'utility' | 'marketing'

export interface WaStatus {
  driver: 'fake' | 'meta'
  configured: boolean
  /** Masked: "...1234". */
  phoneNumberId: string | null
  businessAccountId: string | null
  webhookUrl: string
  verifyTokenSet: boolean
  appSecretSet: boolean
  lastWebhookAt: string | null
}

export interface WaSummary {
  total: number
  queued: number
  sent: number
  delivered: number
  read: number
  failed: number
  /** 0..1 or a percentage; null while nothing was sent. */
  deliveryRate: number | null
}

export interface WaMessage {
  id: number
  eventId: number | null
  eventName: string | null
  guestId: number | null
  guestName: string | null
  templateKey: TemplateKey
  locale: Locale
  /** Masked in the admin: "+1305***0123". */
  to: string
  status: MessageStatus
  errorCode: string | null
  errorMessage: string | null
  waMessageId: string | null
  queuedAt: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
}

export interface QuickReplyButton { type: 'quick_reply'; id: 'yes' | 'no'; text: string }

export interface WaTemplate {
  id: number
  key: TemplateKey
  locale: Locale
  metaName: string
  category: TemplateCategory
  body: string
  buttons: QuickReplyButton[]
  /** Variable names, fixed per template and sent as positional parameters in this order. */
  variables: string[]
  status: TemplateStatus
  rejectionReason: string | null
  submittedAt: string | null
  approvedAt: string | null
  updatedAt: string | null
}

export interface PageMeta { page: number; perPage: number; total: number }
export interface MessagePage { data: WaMessage[]; meta: PageMeta }

export interface PeriodFilter { from: string; to: string }

export interface MessageFilters {
  status: MessageStatus | null
  eventId: number | null
  templateKey: TemplateKey | null
  q: string
}

export interface TemplateEdit { body?: string; category?: TemplateCategory; reason: string }
export interface TestSend { to: string; templateKey: TemplateKey; locale: Locale; reason: string }

export interface WaError {
  /** Contract code (409 `code` or the first 422 error of a field). */
  code: string | null
  field: string | null
  message: string
}

export interface ViewChip { label: string; color: string; icon: string }
