import { API } from '@/services/axios'
import * as mock from './mock'
import type {
  ActivateResult, Grant, Impact, Package, PackagePage, PackagePreviewBody, PackagesQuery, ValidateResult,
} from './types'

/**
 * Client of admin/templates/packages (docs/plans/template-package-spec.md §7.2). `admin.reauth` needs nothing here:
 * the axios interceptor opens the password dialog on 403 `reauth_required` and repeats the request.
 * VITE_TEMPLATES_PACKAGES_MOCK=true switches every call to an in-memory simulation (./mock.ts) with the same shapes and errors.
 */
export const useMock = import.meta.env.VITE_TEMPLATES_PACKAGES_MOCK === 'true'

const BASE = 'templates/packages'

export async function listPackages(query: PackagesQuery = {}): Promise<PackagePage> {
  if (useMock) return mock.listPackages(query)
  const params: Record<string, unknown> = {}
  if (query.status) params.status = query.status
  if (query.visibility) params.visibility = query.visibility
  if (query.page) params.page = query.page
  if (query.perPage) params.per_page = query.perPage
  const { data } = await API.get(BASE, { params })
  return { items: data.data, meta: data.meta ?? { page: 1, perPage: data.data.length, total: data.data.length } }
}

export async function getPackage(id: number): Promise<Package> {
  if (useMock) return mock.getPackage(id)
  return (await API.get(`${BASE}/${id}`)).data.data
}

/** Uploads the zip (multipart, field `package`) and gets the validation report; a faulty content is a 200 with `valid: false`. */
export async function validatePackage(file: File, onProgress?: (fraction: number) => void): Promise<ValidateResult> {
  if (useMock) return mock.validatePackage(file, onProgress)
  const form = new FormData()
  form.append('package', file)
  const res = await API.post(`${BASE}/validate`, form, {
    onUploadProgress: e => { if (e.total) onProgress?.(Math.min(1, e.loaded / e.total)) },
  })
  return res.data.data
}

export async function discardStage(token: string): Promise<void> {
  if (useMock) return mock.discardStage(token)
  await API.delete(`${BASE}/stages/${encodeURIComponent(token)}`)
}

export async function installPackage(stageToken: string, reason: string): Promise<Package> {
  if (useMock) return mock.installPackage(stageToken, reason)
  return (await API.post(BASE, { stage_token: stageToken, reason })).data.data
}

export async function getImpact(id: number, action: 'deactivate' | 'withdraw'): Promise<Impact> {
  if (useMock) return mock.getImpact(id, action)
  return (await API.get(`${BASE}/${id}/impact`, { params: { action } })).data.data
}

export async function activatePackage(id: number, reason: string, ackThirdPartyMarks?: boolean): Promise<ActivateResult> {
  if (useMock) return mock.activatePackage(id, reason, ackThirdPartyMarks)
  const body: Record<string, unknown> = { reason }
  if (ackThirdPartyMarks !== undefined) body.ack_third_party_marks = ackThirdPartyMarks
  return (await API.post(`${BASE}/${id}/activate`, body)).data.data
}

export async function deactivatePackage(id: number, reason: string): Promise<Package> {
  if (useMock) return mock.deactivatePackage(id, reason)
  return (await API.post(`${BASE}/${id}/deactivate`, { reason })).data.data
}

/** Withdraws (deletes the files of) a package no event is pinned to. */
export async function withdrawPackage(id: number, reason: string): Promise<void> {
  if (useMock) return mock.withdrawPackage(id, reason)
  await API.delete(`${BASE}/${id}`, { data: { reason } })
}

export async function listGrants(id: number): Promise<Grant[]> {
  if (useMock) return mock.listGrants(id)
  return (await API.get(`${BASE}/${id}/grants`)).data.data
}

export async function createGrant(id: number, target: { eventId?: number; userId?: number }, reason: string): Promise<Grant> {
  if (useMock) return mock.createGrant(id, target, reason)
  const body: Record<string, unknown> = { reason }
  if (target.eventId) body.event_id = target.eventId
  if (target.userId) body.user_id = target.userId
  return (await API.post(`${BASE}/${id}/grants`, body)).data.data
}

export async function revokeGrant(id: number, grantId: number, reason: string): Promise<Grant> {
  if (useMock) return mock.revokeGrant(id, grantId, reason)
  return (await API.post(`${BASE}/${id}/grants/${grantId}/revoke`, { reason })).data.data
}

/** The existing preview endpoint, extended: resolves the sample invitation with the staged or installed package. */
export async function previewPackage(body: PackagePreviewBody): Promise<unknown> {
  if (useMock) return mock.previewPackage(body)
  return (await API.post('templates/preview', body)).data.data
}
