import { askReauth } from '@/services/reauth'
import { LIMITS, isValidCtaUrl } from '../logic'
import type { Announcement, AnnouncementBody, AnnouncementList, AnnouncementStatus, AudienceQuery, ListParams } from '../types'

/**
 * In-memory stand-in for the announcements API, used only with VITE_ANNOUNCEMENTS_MOCK=true (dev and screenshots). It
 * answers with the shapes and the errors of docs/plans/announcements-contract.md: 422 `{message, errors: {<field>:
 * [<code>]}}`, 404 `announcement_not_found` and `reauth_required` (the first write, and again after 5 minutes, opens the
 * real re-authentication dialog, like the axios interceptor does for the real API).
 */

const wait = (ms = 220) => new Promise(r => setTimeout(r, ms))
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const fail = (status: number, data: Record<string, unknown>): never => { throw { response: { status, data } } }
const failValidation = (errors: Record<string, string>): never =>
  fail(422, { message: 'The given data was invalid.', errors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])) })

const MINUTE = 60_000
const DAY = 86_400_000
const REAUTH_WINDOW = 5 * MINUTE
let reauthedAt = 0

/** The server answers 403 reauth_required to a write without a recent confirmation; the interceptor asks and repeats. */
async function requireReauth(): Promise<void> {
  if (Date.now() - reauthedAt < REAUTH_WINDOW) return
  try { await askReauth() } catch { throw { reauthCancelled: true, response: { status: 403, data: { message: 'Reauth required.', code: 'reauth_required' } } } }
  reauthedAt = Date.now()
}

const iso = (offset: number) => new Date(Date.now() + offset).toISOString()

const statusOf = (a: Pick<Announcement, 'isActive' | 'startsAt' | 'endsAt'>, now = Date.now()): AnnouncementStatus => {
  if (!a.isActive) return 'inactive'
  if (new Date(a.startsAt).getTime() > now) return 'scheduled'
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return 'ended'
  return 'active'
}

const make = (id: number, over: Partial<Announcement>): Announcement => {
  const a: Announcement = {
    id, level: 'info', titleEs: '', titleEn: '', bodyEs: '', bodyEn: '', ctaLabelEs: null, ctaLabelEn: null, ctaUrl: null,
    dismissible: true, audience: 'all', upcomingDays: null, startsAt: iso(-DAY), endsAt: null, isActive: true,
    status: 'active', dismissedCount: 0, createdAt: iso(-id * DAY / 2), updatedAt: iso(-id * DAY / 2), ...over,
  }
  a.status = statusOf(a)
  return a
}

let nextId = 100
const items: Announcement[] = [
  make(1, { level: 'warning', titleEs: 'Mantenimiento programado el sábado', titleEn: 'Scheduled maintenance on Saturday', bodyEs: 'El sábado de 2:00 a 3:00 a. m. (hora de Miami) Quinvite estará en mantenimiento. Tus invitaciones seguirán visibles.', bodyEn: 'On Saturday from 2:00 to 3:00 a.m. (Miami time) Quinvite will be under maintenance. Your invitations stay visible.', dismissible: false, startsAt: iso(-2 * 3_600_000), endsAt: iso(2 * DAY), dismissedCount: 0 }),
  make(2, { level: 'news', titleEs: 'Ya puedes enviar la invitación por WhatsApp', titleEn: 'You can now send your invitation by WhatsApp', bodyEs: 'Elige a tus invitados y envíales el enlace de tu invitación con un toque. Pruébalo en la sección Invitados.', bodyEn: 'Pick your guests and send them your invitation link in one tap. Try it in the Guests section.', ctaLabelEs: 'Ver invitados', ctaLabelEn: 'See guests', ctaUrl: '/dashboard/guests', startsAt: iso(-3 * DAY), dismissedCount: 41 }),
  make(3, { level: 'info', titleEs: 'Tu quince se acerca', titleEn: 'Your quince is coming up', bodyEs: 'Revisa la lista de invitados y confirma el menú esta semana.', bodyEn: 'Review your guest list and confirm the menu this week.', audience: 'upcoming_event', upcomingDays: 30, startsAt: iso(-DAY), dismissedCount: 7 }),
  make(4, { level: 'news', titleEs: 'Nuevas plantillas de boda', titleEn: 'New wedding templates', bodyEs: 'Estrenamos tres plantillas pensadas para bodas latinas.', bodyEn: 'We launched three templates made for Latin weddings.', ctaLabelEs: 'Ver plantillas', ctaLabelEn: 'See templates', ctaUrl: 'https://quinvite.com/plantillas', audience: 'free', startsAt: iso(5 * DAY), endsAt: iso(35 * DAY) }),
  make(5, { level: 'info', titleEs: 'Desbloquea todo tu evento', titleEn: 'Unlock your whole event', bodyEs: 'Con el plan completo envías por WhatsApp y suma invitados sin límite.', bodyEn: 'With the full plan you send by WhatsApp and add unlimited guests.', audience: 'free', isActive: false, startsAt: iso(-10 * DAY) }),
  make(6, { level: 'warning', titleEs: 'Revisa tu método de pago', titleEn: 'Check your payment method', bodyEs: 'Un pago reciente no se pudo completar.', bodyEn: 'A recent payment could not be completed.', audience: 'paid', startsAt: iso(-20 * DAY), endsAt: iso(-12 * DAY) }),
  make(7, { level: 'news', titleEs: 'Feliz Día de las Madres', titleEn: 'Happy Mother\'s Day', bodyEs: 'Un detalle para ellas: invitaciones con 20 % menos esta semana.', bodyEn: 'A treat for moms: invitations 20% off this week.', startsAt: iso(-40 * DAY), endsAt: iso(-33 * DAY), dismissedCount: 120 }),
  ...Array.from({ length: 6 }, (_, i) => make(8 + i, { level: (['info', 'news', 'info'] as const)[i % 3], titleEs: `Anuncio de prueba ${i + 1}`, titleEn: `Test announcement ${i + 1}`, bodyEs: 'Texto de ejemplo.', bodyEn: 'Sample text.', startsAt: iso(-(50 + i) * DAY), endsAt: iso(-(45 + i) * DAY) })),
]

/** Rules of the contract; the codes are the contract's. */
function check(b: Partial<AnnouncementBody>): void {
  const e: Record<string, string> = {}
  const text = (key: keyof AnnouncementBody, max: number) => {
    const v = b[key]
    if (typeof v !== 'string' || !v.trim()) e[key] = 'required'
    else if (v.length > max) e[key] = 'too_long'
  }
  if (!['info', 'news', 'warning'].includes(b.level as string)) e.level = 'invalid_level'
  text('title_es', LIMITS.title); text('title_en', LIMITS.title); text('body_es', LIMITS.body); text('body_en', LIMITS.body)
  for (const key of ['cta_label_es', 'cta_label_en'] as const) if ((b[key] ?? '').length > LIMITS.cta) e[key] = 'too_long'
  if (b.cta_url) {
    if (!isValidCtaUrl(b.cta_url)) e.cta_url = 'invalid_url'
    else if (!b.cta_label_es?.trim() || !b.cta_label_en?.trim()) e.cta_label_es = 'cta_label_required'
  }
  if (!['all', 'free', 'paid', 'upcoming_event'].includes(b.audience as string)) e.audience = 'invalid_audience'
  else if (b.audience === 'upcoming_event' && !(Number.isInteger(b.upcoming_days) && (b.upcoming_days as number) >= 1 && (b.upcoming_days as number) <= 365)) e.upcoming_days = 'upcoming_days_required'
  if (!b.starts_at || Number.isNaN(Date.parse(b.starts_at))) e.starts_at = 'required'
  if (b.ends_at && b.starts_at && new Date(b.ends_at) <= new Date(b.starts_at)) e.ends_at = 'ends_before_start'
  if (Object.keys(e).length) failValidation(e)
}

const checkReason = (reason: string) => { if (!reason || reason.trim().length < LIMITS.reasonMin) failValidation({ reason: 'required' }) }

const apply = (a: Announcement, b: AnnouncementBody): void => {
  Object.assign(a, {
    level: b.level, titleEs: b.title_es.trim(), titleEn: b.title_en.trim(), bodyEs: b.body_es.trim(), bodyEn: b.body_en.trim(),
    ctaLabelEs: b.cta_label_es || null, ctaLabelEn: b.cta_label_en || null, ctaUrl: b.cta_url || null,
    dismissible: b.dismissible ?? true, audience: b.audience, upcomingDays: b.audience === 'upcoming_event' ? b.upcoming_days : null,
    startsAt: b.starts_at, endsAt: b.ends_at ?? null, isActive: b.is_active ?? true, updatedAt: new Date().toISOString(),
  })
  a.status = statusOf(a)
}
const find = (id: number): Announcement => items.find(a => a.id === id) ?? fail(404, { message: 'Not found.', code: 'announcement_not_found' })

export async function listAnnouncements(params: ListParams = {}): Promise<AnnouncementList> {
  await wait()
  const perPage = params.perPage ?? 10
  const page = Math.max(1, params.page ?? 1)
  const all = items
    .map(a => ({ ...a, status: statusOf(a) }))
    .filter(a => !params.status || a.status === params.status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return { items: clone(all.slice((page - 1) * perPage, page * perPage)), meta: { page, perPage, total: all.length } }
}

export async function createAnnouncement(body: AnnouncementBody, reason: string): Promise<Announcement> {
  await wait()
  await requireReauth()
  checkReason(reason)
  check(body)
  const a = make(nextId++, { createdAt: new Date().toISOString() })
  apply(a, body)
  items.push(a)
  return clone(a)
}

export async function updateAnnouncement(id: number, body: AnnouncementBody, reason: string): Promise<Announcement> {
  await wait()
  await requireReauth()
  const a = find(id)
  checkReason(reason)
  check(body)
  apply(a, body)
  return clone(a)
}

export async function deleteAnnouncement(id: number, reason: string): Promise<void> {
  await wait()
  await requireReauth()
  const a = find(id)
  checkReason(reason)
  items.splice(items.indexOf(a), 1)
}

export async function previewAudience(query: AudienceQuery): Promise<number> {
  await wait(300)
  switch (query.audience) {
    case 'all': return 482
    case 'free': return 391
    case 'paid': return 91
    case 'upcoming_event': {
      const d = query.upcoming_days
      if (!Number.isInteger(d) || (d as number) < 1) return failValidation({ upcoming_days: 'upcoming_days_required' })
      return Math.min(140, Math.round((d as number) * 1.4))
    }
    default: return failValidation({ audience: 'invalid_audience' })
  }
}
