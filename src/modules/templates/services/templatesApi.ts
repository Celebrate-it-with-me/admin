import { API } from '@/services/axios'
import * as mock from './mock'
import type { DraftBody, PreviewBody, PublishResult, TemplateDetail, TemplateSummary, TemplateVersion } from '../types'

/**
 * Client of admin/templates (docs/plans/admin-templates.md). While the API does not exist, VITE_TEMPLATES_MOCK=true
 * switches every call to an in-memory simulation (./mock.ts) with the same shapes and the same error responses.
 */
export const useMock = import.meta.env.VITE_TEMPLATES_MOCK === 'true'

export async function listTemplates(): Promise<TemplateSummary[]> {
  if (useMock) return mock.listTemplates()
  return (await API.get('templates')).data.data
}

export async function getTemplate(id: number): Promise<TemplateDetail> {
  if (useMock) return mock.getTemplate(id)
  return (await API.get(`templates/${id}`)).data.data
}

export async function getVersion(versionId: number): Promise<TemplateVersion> {
  if (useMock) return mock.getVersion(versionId)
  return (await API.get(`templates/versions/${versionId}`)).data.data
}

/** The contract does not say what the POST returns: accept the version itself or `{version}`. */
export async function createDraft(templateId: number): Promise<TemplateVersion> {
  if (useMock) return mock.createDraft(templateId)
  const data = (await API.post(`templates/${templateId}/versions`)).data.data
  return data.version ?? data
}

export async function saveDraft(versionId: number, body: DraftBody): Promise<TemplateVersion> {
  if (useMock) return mock.saveDraft(versionId, body)
  const data = (await API.patch(`templates/versions/${versionId}`, body)).data.data
  return data.version ?? data
}

export async function publishVersion(versionId: number, reason: string): Promise<PublishResult> {
  if (useMock) return mock.publishVersion(versionId, reason)
  return (await API.post(`templates/versions/${versionId}/publish`, { reason })).data.data
}

export async function archiveVersion(versionId: number, reason: string): Promise<void> {
  if (useMock) return mock.archiveVersion(versionId, reason)
  await API.post(`templates/versions/${versionId}/archive`, { reason })
}

/** Payload already resolved with the sample data, same shape as `data` of the public invitation endpoint. */
export async function previewPayload(body: PreviewBody): Promise<unknown> {
  if (useMock) return mock.previewPayload(body)
  return (await API.post('templates/preview', body)).data.data
}
