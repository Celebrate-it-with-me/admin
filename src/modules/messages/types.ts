/** Docs: docs/plans/message-editor-contract.md (binding contract with the API). */
export type Locale = 'es' | 'en'

/** An item of GET admin/messages. */
export interface Message {
  key: string
  name: string
  description: string
  locales: Locale[]
  editableFields: string[]
  overridden: Record<Locale, boolean>
  updatedAt: string | null
}

export interface FieldDetail {
  default: string
  current: string
  overridden: boolean
  /** Markers (`:name`) the original text has: all of them must stay. */
  variables: string[]
  maxLength: number
}

export interface MessageVariable {
  name: string
  example: string
}

export interface MessageDetail {
  key: string
  name: string
  locale: Locale
  fields: Record<string, FieldDetail>
  variables: MessageVariable[]
  updatedAt: string | null
  updatedBy: { id: number; name: string } | null
}

export interface MessagePreview {
  subject: string
  preheader: string
  /** Only to show inside an `iframe sandbox` (srcdoc), never with v-html. */
  html: string
}

/** First error code of each field of a 422 (`fields.<name>` comes without the prefix; `locale`, `reason` and `to` stay). */
export type FieldErrors = Record<string, string>

export interface MessageError {
  code: string | null
  field: string | null
  message: string
}
