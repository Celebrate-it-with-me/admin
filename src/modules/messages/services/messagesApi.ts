import { API } from '@/services/axios'
import type { Locale, Message, MessageDetail, MessagePreview } from '../types'

/**
 * Client of admin/messages (contract: docs/plans/message-editor-contract.md). While the API is not in place,
 * VITE_MESSAGES_MOCK=true switches every call to an in-memory simulation (./mock.ts) with the contract's shapes and
 * errors. Writes need a recent re-authentication: the axios interceptor opens the dialog and repeats the request, so
 * nothing here deals with it. Bodies are snake_case; answers come in camelCase.
 */
export const useMock = import.meta.env.DEV && import.meta.env.VITE_MESSAGES_MOCK === 'true'

/** Dynamic so the production bundle (where useMock is statically false) does not contain the mock. */
const loadMock = () => import('./mock')

export async function listMessages(): Promise<Message[]> {
  if (useMock) return (await loadMock()).listMessages()
  return (await API.get('messages')).data.data
}

export async function getMessage(key: string, locale: Locale): Promise<MessageDetail> {
  if (useMock) return (await loadMock()).getMessage(key, locale)
  return (await API.get(`messages/${encodeURIComponent(key)}`, { params: { locale } })).data.data
}

export async function saveMessage(key: string, locale: Locale, fields: Record<string, string>, reason: string): Promise<MessageDetail> {
  if (useMock) return (await loadMock()).saveMessage(key, locale, fields, reason)
  return (await API.put(`messages/${encodeURIComponent(key)}`, { locale, fields, reason })).data.data
}

/** Restores the original text of some fields, or of the whole language when `fields` is empty or missing. */
export async function restoreMessage(key: string, locale: Locale, fields: string[] | null, reason: string): Promise<MessageDetail> {
  const data: { locale: Locale; fields?: string[]; reason: string } = { locale, reason }
  if (fields?.length) data.fields = fields
  if (useMock) return (await loadMock()).restoreMessage(key, data)
  return (await API.delete(`messages/${encodeURIComponent(key)}`, { data })).data.data
}

/** Renders without saving; `fields` are the texts being edited (only the ones that changed). */
export async function previewMessage(key: string, locale: Locale, fields?: Record<string, string>): Promise<MessagePreview> {
  const body: { locale: Locale; fields?: Record<string, string> } = { locale }
  if (fields && Object.keys(fields).length) body.fields = fields
  if (useMock) return (await loadMock()).previewMessage(key, body)
  return (await API.post(`messages/${encodeURIComponent(key)}/preview`, body)).data.data
}

/** Sends the saved version to a staff address (by default the caller's own). */
export async function sendTest(key: string, locale: Locale, reason: string, to?: string): Promise<{ sent: boolean }> {
  const body: { locale: Locale; to?: string; reason: string } = { locale, reason }
  if (to) body.to = to
  if (useMock) return (await loadMock()).sendTest(key, body)
  return (await API.post(`messages/${encodeURIComponent(key)}/test`, body)).data.data
}
