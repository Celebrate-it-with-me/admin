import { API } from '@/services/axios'
import * as mock from './mock'
import type { MessageFilters, MessagePage, PeriodFilter, TemplateEdit, TestSend, WaMessage, WaStatus, WaSummary, WaTemplate } from '../types'
import { messageParams, summaryParams, variableNames } from '../logic'

/**
 * Client of admin/whatsapp (contract: docs/plans/communications-contract.md). While the API is not in place,
 * VITE_WHATSAPP_MOCK=true switches every call to an in-memory simulation (./mock.ts) with the contract's shapes and
 * error responses. Writes need a recent re-authentication: the axios interceptor opens the dialog and repeats the
 * request, so nothing here deals with it.
 */
export const useMock = Boolean(import.meta.env.VITE_WHATSAPP_MOCK) && import.meta.env.VITE_WHATSAPP_MOCK !== 'false'

const template = (t: WaTemplate): WaTemplate => ({ ...t, variables: variableNames(t.variables), buttons: t.buttons ?? [] })

export async function getStatus(): Promise<WaStatus> {
  if (useMock) return mock.getStatus()
  return (await API.get('whatsapp/status')).data.data
}

export async function getSummary(period: PeriodFilter): Promise<WaSummary> {
  if (useMock) return mock.getSummary(period)
  return (await API.get('whatsapp/summary', { params: summaryParams(period) })).data.data
}

export async function listMessages(filters: MessageFilters, period: PeriodFilter, page: number, perPage: number): Promise<MessagePage> {
  if (useMock) return mock.listMessages(filters, period, page, perPage)
  const body = (await API.get('whatsapp/messages', { params: messageParams(filters, period, page, perPage) })).data
  return { data: body.data, meta: body.meta }
}

export async function listTemplates(): Promise<WaTemplate[]> {
  if (useMock) return (await mock.listTemplates()).map(template)
  return (await API.get('whatsapp/templates')).data.data.map(template)
}

export async function updateTemplate(id: number, edit: TemplateEdit): Promise<WaTemplate> {
  if (useMock) return template(await mock.updateTemplate(id, edit))
  return template((await API.put(`whatsapp/templates/${id}`, edit)).data.data)
}

export async function submitTemplate(id: number, reason: string): Promise<WaTemplate> {
  if (useMock) return template(await mock.submitTemplate(id, reason))
  return template((await API.post(`whatsapp/templates/${id}/submit`, { reason })).data.data)
}

export async function syncTemplates(reason: string): Promise<WaTemplate[]> {
  if (useMock) return (await mock.syncTemplates(reason)).map(template)
  return (await API.post('whatsapp/templates/sync', { reason })).data.data.map(template)
}

export async function sendTest(test: TestSend): Promise<WaMessage> {
  const body = { to: test.to, template_key: test.templateKey, locale: test.locale, reason: test.reason }
  if (useMock) return mock.sendTest(body)
  return (await API.post('whatsapp/test', body)).data.data
}

/** Events for the filter (id and name only). Mock mode answers from the simulation. */
export async function searchEvents(search: string): Promise<{ id: number; name: string }[]> {
  if (useMock) return mock.searchEvents(search)
  const res = await API.get('events', { params: { search: search.trim() || undefined, page: 1, perPage: 15 } })
  return (res.data.data as { id: number; name: string }[]).map(e => ({ id: e.id, name: e.name }))
}
