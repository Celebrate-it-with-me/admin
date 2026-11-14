import { askReauth } from '@/services/reauth'
import type { Locale, MessageFilters, MessagePage, MessageStatus, PeriodFilter, TemplateCategory, TemplateEdit, TemplateKey, WaMessage, WaStatus, WaSummary, WaTemplate } from '../types'
import { missingPlaceholders } from '../logic'

/**
 * In-memory stand-in for admin/whatsapp, used only with VITE_WHATSAPP_MOCK (dev and screenshots). It answers with the
 * shapes and the error responses of docs/plans/communications-contract.md: 422 `{message, errors: {<field>: [<code>]}}`
 * and 403/409 `{message, code}`.
 *
 * The connection mode is `VITE_WHATSAPP_MOCK` (`true` = fake) or, at runtime, localStorage `wa_mock_mode`:
 *   `fake`         driver fake, "configured": submitting approves at once;
 *   `meta`         driver meta, configured: submitting leaves `submitted`, syncing approves (one is rejected);
 *   `unconfigured` driver meta without credentials: submit and sync answer 409 whatsapp_unavailable.
 * localStorage `wa_mock_reauth` = `1` makes the first write ask for the re-authentication dialog.
 * Try: a test to a phone that is not E.164 (422 invalid_phone); `padrino_reminder` (409 template_not_approved);
 * a body without all the {{n}} placeholders (422 variables_changed); a search for `fallo` (a list that fails).
 */

type Mode = 'fake' | 'meta' | 'unconfigured'
const readMode = (): Mode => {
  let stored: string | null = null
  try { stored = localStorage.getItem('wa_mock_mode') } catch { /* private window */ }
  const raw = stored ?? String(import.meta.env.VITE_WHATSAPP_MOCK ?? 'fake')
  return raw === 'meta' || raw === 'unconfigured' ? raw : 'fake'
}
const flag = (key: string): boolean => { try { return localStorage.getItem(key) === '1' } catch { return false } }

const wait = (ms = 240) => new Promise(r => setTimeout(r, ms))
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const failValidation = (field: string, code: string): never => {
  throw { response: { status: 422, data: { message: 'The given data was invalid.', errors: { [field]: [code] } } } }
}
const failCode = (status: number, code: string, message = code): never => {
  throw { response: { status, data: { message, code } } }
}

const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(Date.now() - ms).toISOString()

let reauthed = false
/** Same as the axios interceptor: ask for the dialog, and fail like a cancelled one. */
async function writeGuard(reason: string): Promise<void> {
  if (reason.trim().length < 5) failValidation('reason', 'reason')
  if (flag('wa_mock_reauth') && !reauthed) {
    try { await askReauth() } catch { throw { reauthCancelled: true } }
    reauthed = true
  }
}

// ── connection ──

export async function getStatus(): Promise<WaStatus> {
  await wait()
  const mode = readMode()
  const meta = mode !== 'fake'
  const configured = mode !== 'unconfigured'
  return {
    driver: meta ? 'meta' : 'fake',
    configured,
    phoneNumberId: meta && configured ? '...4821' : null,
    businessAccountId: meta && configured ? '...9037' : null,
    webhookUrl: 'https://api.quinvite.com/api/v1/webhooks/whatsapp',
    verifyTokenSet: meta && configured,
    appSecretSet: meta && configured,
    lastWebhookAt: meta && configured ? ago(7 * MIN) : null,
  }
}

// ── templates ──

const BODIES: Record<TemplateKey, Record<Locale, string>> = {
  invitation: {
    es: 'Hola {{1}}, estás invitado a {{2}} el {{3}}. Mira todos los detalles y confirma tu asistencia aquí: {{4}}',
    en: 'Hi {{1}}, you are invited to {{2}} on {{3}}. See all the details and RSVP here: {{4}}',
  },
  save_the_date: {
    es: 'Hola {{1}}, guarda la fecha: {{2}} será el {{3}}. Pronto te enviaremos la invitación completa. {{4}}',
    en: 'Hi {{1}}, save the date: {{2}} is on {{3}}. The full invitation is coming soon. {{4}}',
  },
  reminder_pending: {
    es: 'Hola {{1}}, {{2}} es en {{3}} días y aún no tenemos tu respuesta. Confírmanos aquí: {{4}}',
    en: 'Hi {{1}}, {{2}} is in {{3}} days and we still do not have your answer. Let us know here: {{4}}',
  },
  rsvp_confirmation: {
    es: 'Gracias {{1}}. Registramos tu respuesta para {{2}}: {{3}}.',
    en: 'Thank you {{1}}. We recorded your answer for {{2}}: {{3}}.',
  },
  padrino_reminder: {
    es: 'Hola {{1}}, un recordatorio para {{2}}: tu aportación de {{3}} ({{4}}) vence el {{5}}.',
    en: 'Hi {{1}}, a reminder for {{2}}: your contribution of {{3}} ({{4}}) is due on {{5}}.',
  },
}
const VARIABLES: Record<TemplateKey, string[]> = {
  invitation: ['guest_name', 'event_name', 'event_date', 'link'],
  save_the_date: ['guest_name', 'event_name', 'event_date', 'link'],
  reminder_pending: ['guest_name', 'event_name', 'days_left', 'link'],
  rsvp_confirmation: ['guest_name', 'event_name', 'status_text'],
  padrino_reminder: ['padrino_name', 'event_name', 'item_name', 'amount', 'due_date'],
}
const BUTTONS = (locale: Locale) => [
  { type: 'quick_reply' as const, id: 'yes' as const, text: locale === 'es' ? 'Sí, asistiré' : 'Yes, I will attend' },
  { type: 'quick_reply' as const, id: 'no' as const, text: locale === 'es' ? 'No podré ir' : 'I cannot make it' },
]

let nextTemplateId = 1
const templates: WaTemplate[] = (Object.keys(BODIES) as TemplateKey[]).flatMap(key => (['es', 'en'] as Locale[]).map((locale): WaTemplate => {
  const approved = key !== 'padrino_reminder'
  return {
    id: nextTemplateId++,
    key,
    locale,
    metaName: `quinvite_${key}_${locale}`,
    category: key === 'invitation' || key === 'save_the_date' ? 'marketing' : 'utility',
    body: BODIES[key][locale],
    buttons: key === 'invitation' || key === 'reminder_pending' ? BUTTONS(locale) : [],
    variables: [...VARIABLES[key]],
    status: approved ? 'approved' : 'draft',
    rejectionReason: null,
    submittedAt: approved ? ago(9 * DAY) : null,
    approvedAt: approved ? ago(8 * DAY) : null,
    updatedAt: ago(9 * DAY),
  }
}))
// One of each of the other states, so every chip shows up.
Object.assign(templates.find(t => t.key === 'save_the_date' && t.locale === 'en')!, { status: 'rejected', rejectionReason: 'Meta la rechazó: el cuerpo parece promocional para una categoría de utilidad. Cambia la categoría a marketing o reescribe el texto.', approvedAt: null })
Object.assign(templates.find(t => t.key === 'reminder_pending' && t.locale === 'en')!, { status: 'paused', approvedAt: ago(20 * DAY) })
Object.assign(templates.find(t => t.key === 'rsvp_confirmation' && t.locale === 'en')!, { status: 'submitted', approvedAt: null, submittedAt: ago(2 * HOUR) })

const findTemplate = (id: number): WaTemplate => templates.find(t => t.id === id) ?? failCode(404, 'not_found', 'Not found.')

export async function listTemplates(): Promise<WaTemplate[]> {
  await wait()
  return clone(templates)
}

export async function updateTemplate(id: number, edit: TemplateEdit): Promise<WaTemplate> {
  await wait()
  await writeGuard(edit.reason)
  const t = findTemplate(id)
  if (edit.body !== undefined) {
    // The variables are fixed: all of them must stay, and no new ones may appear.
    const used = Array.from(edit.body.matchAll(/\{\{(\d+)\}\}/g), m => Number(m[1]))
    if (missingPlaceholders(edit.body, t.variables.length).length || used.some(n => n < 1 || n > t.variables.length)) {
      failValidation('body', 'variables_changed')
    }
    t.body = edit.body
  }
  if (edit.category) t.category = edit.category as TemplateCategory
  if (t.status === 'approved' || t.status === 'rejected') { t.status = 'draft'; t.approvedAt = null; t.rejectionReason = null }
  t.updatedAt = new Date().toISOString()
  return clone(t)
}

export async function submitTemplate(id: number, reason: string): Promise<WaTemplate> {
  await wait()
  await writeGuard(reason)
  const mode = readMode()
  if (mode === 'unconfigured') failCode(409, 'whatsapp_unavailable', 'WhatsApp is not configured.')
  const t = findTemplate(id)
  const now = new Date().toISOString()
  t.submittedAt = now
  t.rejectionReason = null
  t.status = mode === 'fake' ? 'approved' : 'submitted'
  t.approvedAt = mode === 'fake' ? now : null
  t.updatedAt = now
  return clone(t)
}

export async function syncTemplates(reason: string): Promise<WaTemplate[]> {
  await wait(500)
  await writeGuard(reason)
  if (readMode() === 'unconfigured') failCode(409, 'whatsapp_unavailable', 'WhatsApp is not configured.')
  const now = new Date().toISOString()
  for (const t of templates.filter(x => x.status === 'submitted')) {
    t.status = 'approved'
    t.approvedAt = now
    t.updatedAt = now
  }
  return clone(templates)
}

// ── messages ──

const EVENTS = [
  { id: 4, name: 'Los XV de Valentina' },
  { id: 7, name: 'Boda de Andrea y Mateo' },
  { id: 9, name: 'Los XV de Camila' },
]
const GUESTS = ['Marisol Vega', 'Carlos Pérez', 'Lucía Fernández', 'Daniel Ortiz', 'Tía Rosa', 'Abuela Elena', 'Primo Jorge', 'Ana Gutiérrez', 'Luis Herrera', 'Sofía Morales', 'Pedro Castillo', 'Isabel Rivas']
const MASKS = ['+1305***0123', '+1786***4471', '+1954***2208', '+5215***9930', '+3466***1275', '+1305***8842']
const KEYS: TemplateKey[] = ['invitation', 'invitation', 'invitation', 'save_the_date', 'reminder_pending', 'rsvp_confirmation']
const FAILURES: [string, string][] = [
  ['131026', 'Message undeliverable'],
  ['131047', 'Re-engagement message'],
  ['invalid_phone', 'The phone is not a valid E.164 number.'],
  ['131049', 'This message was not delivered to maintain healthy ecosystem engagement.'],
  ['unknown_delivery', 'Meta did not confirm the send (timeout).'],
]

const buildMessages = (): WaMessage[] => {
  const out: WaMessage[] = []
  for (let i = 0; i < 64; i++) {
    const queuedMs = (i * 83 + (i % 5) * 40) * MIN + 4 * MIN
    const roll = i % 11
    const status: MessageStatus = i < 2 ? 'queued' : roll === 3 || roll === 8 ? 'failed' : roll === 0 || roll === 5 ? 'sent' : roll === 1 || roll === 6 || roll === 9 ? 'delivered' : 'read'
    const ev = EVENTS[i % 3]
    const failure = FAILURES[i % FAILURES.length]
    const sentMs = queuedMs - 20_000
    out.push({
      id: 500 - i,
      eventId: ev.id,
      eventName: ev.name,
      guestId: 100 + (i % GUESTS.length),
      guestName: GUESTS[i % GUESTS.length],
      templateKey: KEYS[i % KEYS.length],
      locale: i % 7 === 4 ? 'en' : 'es',
      to: MASKS[i % MASKS.length],
      status,
      errorCode: status === 'failed' ? failure[0] : null,
      errorMessage: status === 'failed' ? failure[1] : null,
      waMessageId: status === 'queued' || (status === 'failed' && (failure[0] === 'invalid_phone' || failure[0] === 'unknown_delivery')) ? null : `wamid.HBgLMTMwNTU1${String(5000 + i)}`,
      queuedAt: ago(queuedMs),
      sentAt: status === 'queued' || status === 'failed' ? null : ago(sentMs),
      deliveredAt: status === 'delivered' || status === 'read' ? ago(sentMs - 6_000) : null,
      readAt: status === 'read' ? ago(sentMs - 5 * MIN) : null,
      failedAt: status === 'failed' ? ago(sentMs) : null,
    })
  }
  return out
}
const messages: WaMessage[] = buildMessages()

const inPeriod = (m: WaMessage, p: PeriodFilter): boolean => {
  const t = new Date(m.queuedAt ?? 0).getTime()
  if (p.from && t < new Date(`${p.from}T00:00:00`).getTime()) return false
  if (p.to && t > new Date(`${p.to}T23:59:59`).getTime()) return false
  return true
}

export async function getSummary(period: PeriodFilter): Promise<WaSummary> {
  await wait()
  const list = messages.filter(m => inPeriod(m, period))
  const count = (s: MessageStatus) => list.filter(m => m.status === s).length
  // A message that was read was also delivered and sent: the counters are by current status, like the contract's.
  const total = list.length
  const sentOut = list.filter(m => m.status !== 'queued' && m.status !== 'failed').length
  const delivered = count('delivered') + count('read')
  return {
    total, queued: count('queued'), sent: count('sent'), delivered: count('delivered'), read: count('read'), failed: count('failed'),
    deliveryRate: sentOut ? Math.round((delivered / sentOut) * 1000) / 1000 : null,
  }
}

export async function listMessages(filters: MessageFilters, period: PeriodFilter, page: number, perPage: number): Promise<MessagePage> {
  await wait()
  if (filters.q.trim().toLowerCase() === 'fallo') failCode(500, 'server_error', 'boom')
  const q = filters.q.trim().toLowerCase()
  const list = messages.filter(m =>
    inPeriod(m, period)
    && (!filters.status || m.status === filters.status)
    && (!filters.eventId || m.eventId === filters.eventId)
    && (!filters.templateKey || m.templateKey === filters.templateKey)
    && (!q || m.to.replace(/\*/g, '').includes(q.replace(/\D/g, '') || '§') || (m.guestName ?? '').toLowerCase().includes(q)))
  const from = (page - 1) * perPage
  return clone({ data: list.slice(from, from + perPage), meta: { page, perPage, total: list.length } })
}

export async function sendTest(body: { to: string; template_key: TemplateKey; locale: Locale; reason: string }): Promise<WaMessage> {
  await wait()
  await writeGuard(body.reason)
  if (!/^\+[1-9]\d{7,14}$/.test(body.to)) failValidation('to', 'invalid_phone')
  const t = templates.find(x => x.key === body.template_key && x.locale === body.locale)
  if (!t || t.status !== 'approved') failCode(409, 'template_not_approved', 'The template is not approved.')
  const now = new Date().toISOString()
  const created: WaMessage = {
    id: messages.reduce((max, m) => Math.max(max, m.id), 0) + 1,
    eventId: null, eventName: null, guestId: null, guestName: null,
    templateKey: body.template_key, locale: body.locale,
    to: `${body.to.slice(0, 5)}***${body.to.slice(-4)}`,
    status: 'queued', errorCode: null, errorMessage: null, waMessageId: null,
    queuedAt: now, sentAt: null, deliveredAt: null, readAt: null, failedAt: null,
  }
  messages.unshift(created)
  return clone(created)
}

export async function searchEvents(search: string): Promise<{ id: number; name: string }[]> {
  await wait(120)
  const q = search.trim().toLowerCase()
  return clone(EVENTS.filter(e => !q || e.name.toLowerCase().includes(q)))
}
