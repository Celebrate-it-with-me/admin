/** Shapes of the template package API (docs/plans/template-package-spec.md §7). All `data` is camelCase. */

import type { EventTypeSlug, Locale } from '../types'

/** Spec §6.1 `template_packages.status`. */
export type PackageStatus = 'installed' | 'active' | 'deactivated' | 'withdrawn'
export type Visibility = 'public' | 'private'

export interface PackageSummary {
  id: number
  slug: string
  semver: string
  level: 1 | 2
  visibility: Visibility
  tier: 'free' | 'premium'
  status: PackageStatus
  name: Record<Locale, string>
  eventTypes: EventTypeSlug[]
  engineMin: number
  author: { name: string; url?: string | null } | null
  sizeBytes: number
  installedAt: string | null
  eventsPinned: number
}

export interface ThirdPartyMark { name: string; owner: string; usage: string }

export interface AssetCredit {
  path: string
  title: string
  author: string
  source: string
  license: string
  url?: string | null
}

export interface PackageFile { path: string; size: number; sha256: string; mime: string }

export interface PackageManifest {
  description?: Record<Locale, string>
  license?: { id: string; summary: string; document?: string }
  assetsCredits?: AssetCredit[]
  thirdPartyMarks?: ThirdPartyMark[]
  /** From tokens.json when the API sends it: the presets the preview can switch between. */
  presets?: Record<string, { label?: Partial<Record<Locale, string>> }>
  [key: string]: unknown
}

export interface PackageTemplateRef {
  id: number
  slug: string
  versionId: number | null
  versionStatus: 'draft' | 'published' | 'archived' | null
}

export interface Package extends PackageSummary {
  manifest: PackageManifest
  files: PackageFile[]
  templates: PackageTemplateRef[]
  contentHash?: string | null
  zipSha256?: string | null
  installedBy?: { id: number; name: string } | string | null
  deactivatedAt?: string | null
  withdrawnAt?: string | null
}

export interface ReportItem {
  file: string | null
  line?: number | null
  code: string
  message: string
  detail?: string | null
}

export interface ReportStats { files: number; uncompressedBytes: number; runtimeBytes: number; firstFoldBytes: number }

export interface ValidationReport {
  errors: ReportItem[]
  warnings: ReportItem[]
  stats: ReportStats
  manifest: {
    slug: string; version: string; level: number; visibility: Visibility; tier: string
    presets?: Record<string, { label?: Partial<Record<Locale, string>> }>
  } | null
}

export interface ValidateResult {
  valid: boolean
  stageToken: string | null
  expiresAt: string | null
  report: ValidationReport
}

export interface Impact {
  eventsPinned: number
  eventsUnpublished: number
  templates: { id: number; slug: string; eventsUnpublished?: number }[]
}

export interface Grant {
  id: number
  packageSlug: string
  eventId: number | null
  userId: number | null
  grantedBy: number | null
  grantReason: string
  createdAt: string
  revokedAt: string | null
  revokedBy: number | null
  revokeReason: string | null
}

export interface PackagesQuery { status?: PackageStatus | null; visibility?: Visibility | null; page?: number; perPage?: number }
export interface PageMeta { page: number; perPage: number; total: number }
export interface PackagePage { items: PackageSummary[]; meta: PageMeta }

export interface ActivateResult { package: Package; eventsOnPreviousVersion: number }

/** What the preview of a package can show (the `state` values are not fixed by the spec: see PREVIEW_STATES). */
export type PreviewState = 'invitation' | 'save_the_date' | 'no_photo'

export interface PackagePreviewBody {
  locale: Locale
  eventType: EventTypeSlug
  /** One of the two: the staged zip (before installing) or the installed package. */
  stage_token?: string
  package_id?: number
  preset?: string
  state?: PreviewState
}

export interface PackageError {
  code: string | null
  status: number | null
  message: string
  fields: Record<string, string>
  /** Extra data some errors carry: `eventsPinned` (package_in_use), `packageId` (package_exists). */
  eventsPinned: number | null
  packageId: number | null
  reauthCancelled: boolean
}
