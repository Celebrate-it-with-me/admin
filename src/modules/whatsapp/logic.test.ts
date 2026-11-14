import { describe, expect, it } from 'vitest'
import {
  agoLabel, canSubmit, emptyMessageFilters, emptyPeriod, failureText, hasMessageFilters, isSendable, isUnknownDelivery, messageChip, messageParams, messageTimeline,
  missingPlaceholders, parseWaError, placeholder, rateLabel, sortTemplates, summaryParams, variableNames,
} from './logic'
import type { WaMessage, WaTemplate } from './types'

const tpl = (key: WaTemplate['key'], locale: WaTemplate['locale']): WaTemplate => ({
  id: 1, key, locale, metaName: '', category: 'utility', body: '', buttons: [], variables: [], status: 'draft', rejectionReason: null, submittedAt: null, approvedAt: null, updatedAt: null,
})

describe('whatsapp logic', () => {
  it('builds snake_case query params and skips empty filters', () => {
    expect(messageParams(emptyMessageFilters(), emptyPeriod(), 1, 15)).toEqual({ page: 1, per_page: 15 })
    const params = messageParams({ status: 'failed', eventId: 4, templateKey: 'invitation', q: ' +1305 ' }, { from: '2026-11-01', to: '2026-11-30' }, 2, 25)
    expect(params).toEqual({ page: 2, per_page: 25, status: 'failed', event_id: 4, template_key: 'invitation', q: '+1305', from: '2026-11-01', to: '2026-11-30' })
    expect(summaryParams({ from: '', to: '2026-11-30' })).toEqual({ to: '2026-11-30' })
  })

  it('knows when a filter or a period is active', () => {
    expect(hasMessageFilters(emptyMessageFilters(), emptyPeriod())).toBe(false)
    expect(hasMessageFilters(emptyMessageFilters(), { from: '2026-11-01', to: '' })).toBe(true)
    expect(hasMessageFilters({ ...emptyMessageFilters(), q: ' ' }, emptyPeriod())).toBe(false)
  })

  it('formats the delivery rate as a 0..1 ratio, and null as a dash', () => {
    expect(rateLabel(null)).toBe('—')
    expect(rateLabel(0)).toBe('0 %')
    expect(rateLabel(0.9)).toBe('90 %')
    expect(rateLabel(0.875)).toBe('87.5 %')
    expect(rateLabel(1)).toBe('100 %')
  })

  it('gives unconfirmed deliveries their own chip and explanation', () => {
    expect(isUnknownDelivery({ status: 'failed', errorCode: 'unknown_delivery' })).toBe(true)
    expect(isUnknownDelivery({ status: 'failed', errorCode: '131026' })).toBe(false)
    expect(messageChip({ status: 'failed', errorCode: 'unknown_delivery' }).label).toBe('Sin confirmar')
    expect(messageChip({ status: 'failed', errorCode: null }).label).toBe('Fallido')
    expect(failureText({ errorCode: 'unknown_delivery', errorMessage: 'timeout' })).toBe('No sabemos si llegó: Meta no confirmó el envío (timeout). No se reintenta solo.')
  })

  it('translates the daily and retry limits', () => {
    expect(parseWaError({ response: { status: 429, data: { code: 'whatsapp_daily_limit' } } }).message).toContain('tope diario')
    expect(parseWaError({ response: { status: 409, data: { code: 'retry_limit' } } }).message).toContain('3 veces')
  })

  it('sorts templates by key then locale and tells what can be submitted or sent', () => {
    const sorted = sortTemplates([tpl('padrino_reminder', 'en'), tpl('invitation', 'en'), tpl('invitation', 'es')])
    expect(sorted.map(t => `${t.key}/${t.locale}`)).toEqual(['invitation/es', 'invitation/en', 'padrino_reminder/en'])
    expect(canSubmit({ status: 'draft' })).toBe(true)
    expect(canSubmit({ status: 'rejected' })).toBe(true)
    expect(canSubmit({ status: 'submitted' })).toBe(false)
    expect(canSubmit({ status: 'approved' })).toBe(false)
    expect(isSendable({ status: 'approved' })).toBe(true)
    expect(isSendable({ status: 'paused' })).toBe(false)
  })

  it('finds the placeholders a body lost', () => {
    expect(placeholder(0)).toBe('{{1}}')
    expect(missingPlaceholders('Hola {{1}} {{2}} {{3}}', 3)).toEqual([])
    expect(missingPlaceholders('Hola {{1}} {{3}}', 3)).toEqual(['{{2}}'])
  })

  it('accepts variables as names or as objects', () => {
    expect(variableNames(['a', { name: 'b' }, null])).toEqual(['a', 'b'])
    expect(variableNames(undefined)).toEqual([])
  })

  it('explains failures in plain Spanish, falling back to the server text', () => {
    expect(failureText({ errorCode: '131026', errorMessage: 'Message undeliverable' })).toContain('no tiene WhatsApp')
    expect(failureText({ errorCode: '999', errorMessage: 'Algo raro' })).toBe('Algo raro')
    expect(failureText({ errorCode: '999', errorMessage: null })).toBe('Error 999.')
    expect(failureText({ errorCode: null, errorMessage: null })).toContain('No sabemos')
  })

  it('shows the timeline only for the steps that happened', () => {
    const m = { queuedAt: 'a', sentAt: 'b', deliveredAt: null, readAt: null, failedAt: 'c' } as WaMessage
    expect(messageTimeline(m).map(s => s.key)).toEqual(['queued', 'sent', 'failed'])
  })

  it('says how long ago something happened', () => {
    const now = Date.parse('2026-11-14T12:00:00Z')
    expect(agoLabel(null)).toBe('Nunca')
    expect(agoLabel('2026-11-14T11:55:00Z', now)).toBe('hace 5 min')
    expect(agoLabel('2026-11-12T12:00:00Z', now)).toBe('hace 2 días')
  })

  it('turns each contract error into a Spanish message', () => {
    const code = (status: number, c: string) => ({ response: { status, data: { code: c } } })
    expect(parseWaError(code(409, 'whatsapp_unavailable')).message).toContain('no está conectado')
    expect(parseWaError(code(409, 'template_not_approved')).code).toBe('template_not_approved')
    const v = parseWaError({ response: { status: 422, data: { errors: { body: ['variables_changed'] } } } })
    expect(v).toMatchObject({ code: 'variables_changed', field: 'body' })
    expect(v.message).toContain('variables')
    expect(parseWaError({ response: { status: 422, data: { errors: { to: ['invalid_phone'] } } } })).toMatchObject({ field: 'to', code: 'invalid_phone' })
    expect(parseWaError({ reauthCancelled: true }).message).toContain('cancelaste')
    expect(parseWaError(new Error('offline')).message).toContain('No hay conexión')
    expect(parseWaError({ response: { status: 403, data: {} } }).message).toContain('permiso')
    expect(parseWaError({ response: { status: 500, data: {} } }).message).toContain('No pudimos')
  })
})
