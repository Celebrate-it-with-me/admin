/** Docs: docs/plans/announcements-contract.md (binding contract with the API). */
export type Level = 'info' | 'news' | 'warning'
export type Audience = 'all' | 'free' | 'paid' | 'upcoming_event'
export type AnnouncementStatus = 'scheduled' | 'active' | 'ended' | 'inactive'
export type Lang = 'es' | 'en'

export interface Announcement {
  id: number
  level: Level
  titleEs: string
  titleEn: string
  bodyEs: string
  bodyEn: string
  ctaLabelEs: string | null
  ctaLabelEn: string | null
  ctaUrl: string | null
  dismissible: boolean
  audience: Audience
  upcomingDays: number | null
  startsAt: string
  endsAt: string | null
  isActive: boolean
  status: AnnouncementStatus
  dismissedCount: number
  createdAt: string
  updatedAt: string
}

export interface PageMeta {
  page: number
  perPage: number
  total: number
}

export interface AnnouncementList {
  items: Announcement[]
  meta: PageMeta
}

export interface ListParams {
  status?: AnnouncementStatus | null
  page?: number
  perPage?: number
}

/** What the form edits. Dates are `datetime-local` strings in the browser's time zone; numbers stay text while typing. */
export interface AnnouncementForm {
  level: Level
  titleEs: string
  titleEn: string
  bodyEs: string
  bodyEn: string
  ctaLabelEs: string
  ctaLabelEn: string
  ctaUrl: string
  dismissible: boolean
  audience: Audience
  upcomingDays: string
  startsAt: string
  endsAt: string
  isActive: boolean
}

/** Body of POST and PUT (snake_case, without `reason`). */
export interface AnnouncementBody {
  level: Level
  title_es: string
  title_en: string
  body_es: string
  body_en: string
  cta_label_es: string | null
  cta_label_en: string | null
  cta_url: string | null
  dismissible: boolean
  audience: Audience
  upcoming_days: number | null
  starts_at: string
  ends_at: string | null
  is_active: boolean
}

export interface AudienceQuery {
  audience: Audience
  upcoming_days?: number
}

/** First error code per body field, as the form shows them. */
export type FieldErrors = Partial<Record<keyof AnnouncementBody | 'reason', string>>

export interface AnnouncementError {
  code: string | null
  field: string | null
  message: string
}
