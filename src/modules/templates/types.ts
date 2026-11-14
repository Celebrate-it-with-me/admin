/** Shapes of the admin templates API (docs/plans/admin-templates.md). */

export type VersionStatus = 'draft' | 'published' | 'archived'
export type Locale = 'es' | 'en'
export type EventTypeSlug = 'quinceanera' | 'wedding'

export interface TemplateSummary {
  id: number
  slug: string
  name: string
  eventTypeId: number | null
  tier: string
  isActive: boolean
  currentVersion: { id: number; version: number; publishedAt: string | null } | null
  draftVersionId: number | null
  eventsCount: number
}

export interface VersionRow {
  id: number
  version: number
  status: VersionStatus
  notes: string | null
  createdAt: string | null
  publishedAt: string | null
  eventsCount: number
}

export interface TemplateDetail extends TemplateSummary {
  versions: VersionRow[]
}

export type Localized = Record<Locale, string | null>

export interface Section {
  type: string
  enabled: boolean
  order: number
  title: Localized
  text: Localized
  settings: Record<string, unknown>
}

/** A section in the editor: the same data plus a client-only key (never sent) so rows keep their identity when moved. */
export interface EditorSection extends Section {
  key: string
}

export interface ThemeColors {
  surface: string
  surfaceAlt: string
  ink: string
  inkSoft: string
  accent: string
  primary: string
}

export interface ThemePreset {
  label: Record<Locale, string>
  colors: ThemeColors
}

export interface Theme {
  theme: string
  fonts: { heading: string; body: string; script: string }
  preset: string
  presets: Record<string, ThemePreset>
}

export interface TemplateVersion {
  id: number
  templateId: number
  version: number
  status: VersionStatus
  schemaVersion: number
  sections: Section[]
  theme: Theme
  notes: string | null
  createdAt?: string | null
  publishedAt?: string | null
  archivedAt?: string | null
}

export interface DraftBody {
  sections: Section[]
  theme: Theme
  notes: string | null
}

export interface PreviewBody {
  sections: Section[]
  theme: Theme
  locale: Locale
  eventType: EventTypeSlug
}

export interface PublishResult {
  version: TemplateVersion
  eventsOnPreviousVersion: number
}

/** Errors by field path as Laravel sends them (`sections.2.title.es`), first message each. */
export type FieldErrors = Record<string, string>

export interface ExplainedError {
  /** `draft_exists`, `version_immutable`, ... when the API sent a code. */
  code: string | null
  status: number | null
  message: string
  fields: FieldErrors
  draftVersionId: number | null
}
