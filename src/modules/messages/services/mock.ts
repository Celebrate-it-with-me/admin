import { askReauth } from '@/services/reauth'
import { REASON_MIN, extractVariables, hasHtml, hasLink, missingVariables, unknownVariables } from '../logic'
import type { Locale, Message, MessageDetail, MessagePreview, MessageVariable } from '../types'

/**
 * In-memory stand-in for the messages API, used only with VITE_MESSAGES_MOCK=true (dev and screenshots). It answers with
 * the shapes and the errors of docs/plans/message-editor-contract.md: 422 `{message, errors: {fields.<name>: [<code>]}}`,
 * 404 `message_not_found`, 429 on the sixth test of the hour and `reauth_required` (the first write, and again after 5
 * minutes, opens the real re-authentication dialog, like the axios interceptor does for the real API).
 */

const wait = (ms = 220) => new Promise(r => setTimeout(r, ms))
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const fail = (status: number, data: Record<string, unknown>): never => { throw { response: { status, data } } }
const failValidation = (errors: Record<string, string>): never =>
  fail(422, { message: 'The given data was invalid.', errors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])) })

const MINUTE = 60_000
const REAUTH_WINDOW = 5 * MINUTE
let reauthedAt = 0

/** The server answers 403 reauth_required to a write without a recent confirmation; the interceptor asks and repeats. */
async function requireReauth(): Promise<void> {
  if (Date.now() - reauthedAt < REAUTH_WINDOW) return
  try { await askReauth() } catch { throw { reauthCancelled: true, response: { status: 403, data: { message: 'Reauth required.', code: 'reauth_required' } } } }
  reauthedAt = Date.now()
}

const STAFF = ['admin@cwm.test', 'soporte@cwm.test']
const ME = { id: 1, name: 'Admin Quinvite' }
const MAX: Record<string, number> = { subject: 150, preheader: 200, title: 150 }
const maxOf = (field: string) => MAX[field] ?? 1000

type Texts = Record<string, { es: string; en: string }>
interface Def { key: string; name: string; description: string; variables: MessageVariable[]; texts: Texts }

const DEFS: Def[] = [
  {
    key: 'confirm', name: 'Confirmar correo', description: 'Se envía al crear la cuenta para que la organizadora confirme su correo.',
    variables: [{ name: 'name', example: 'Marisol' }],
    texts: {
      subject: { es: 'Confirma tu correo, :name', en: 'Confirm your email, :name' },
      preheader: { es: 'Un toque y tu cuenta de Quinvite queda lista.', en: 'One tap and your Quinvite account is ready.' },
      title: { es: 'Hola, :name', en: 'Hi, :name' },
      intro: { es: 'Gracias por crear tu cuenta en Quinvite. Confirma tu correo para empezar a preparar la invitación de tu quince o tu boda.', en: 'Thanks for creating your Quinvite account. Confirm your email to start preparing your quince or wedding invitation.' },
      action: { es: 'Confirmar mi correo', en: 'Confirm my email' },
      outro: { es: 'Si no creaste esta cuenta, puedes ignorar este mensaje.', en: 'If you did not create this account, you can ignore this message.' },
    },
  },
  {
    key: 'welcome', name: 'Bienvenida', description: 'Llega al confirmar el correo, con los primeros pasos.',
    variables: [{ name: 'name', example: 'Marisol' }],
    texts: {
      subject: { es: 'Bienvenida a Quinvite, :name', en: 'Welcome to Quinvite, :name' },
      preheader: { es: 'Tres pasos para tener lista tu invitación.', en: 'Three steps to get your invitation ready.' },
      title: { es: 'Qué alegría tenerte aquí, :name', en: 'So happy to have you, :name' },
      intro: { es: 'Crea tu evento, elige una plantilla y comparte la invitación con tus invitados por WhatsApp. Lo demás lo vamos armando juntas.', en: 'Create your event, pick a template and share the invitation with your guests on WhatsApp. We will build the rest together.' },
      action: { es: 'Crear mi evento', en: 'Create my event' },
    },
  },
  {
    key: 'reset-password', name: 'Restablecer contraseña', description: 'Enlace para elegir una contraseña nueva; vence en pocos minutos.',
    variables: [{ name: 'name', example: 'Carlos' }, { name: 'minutes', example: '60' }],
    texts: {
      subject: { es: 'Restablece tu contraseña', en: 'Reset your password' },
      title: { es: 'Hola, :name', en: 'Hi, :name' },
      intro: { es: 'Recibimos una solicitud para cambiar tu contraseña. El enlace vence en :minutes minutos.', en: 'We received a request to change your password. The link expires in :minutes minutes.' },
      action: { es: 'Elegir una contraseña nueva', en: 'Choose a new password' },
      outro: { es: 'Si no fuiste tú, no hagas nada: tu contraseña sigue igual.', en: 'If it was not you, do nothing: your password stays the same.' },
    },
  },
  {
    key: 'invoice', name: 'Factura', description: 'Factura del pago del evento, con el PDF adjunto.',
    variables: [{ name: 'number', example: 'F-2027-0042' }, { name: 'event', example: 'Los XV de Valentina' }],
    texts: {
      subject: { es: 'Tu factura :number de Quinvite', en: 'Your Quinvite invoice :number' },
      preheader: { es: 'Adjuntamos el PDF de tu compra.', en: 'The PDF of your purchase is attached.' },
      title: { es: 'Gracias por tu compra', en: 'Thank you for your purchase' },
      intro: { es: 'Aquí tienes la factura :number de «:event». La encuentras adjunta en PDF y también en tu cuenta.', en: 'Here is invoice :number for “:event”. It is attached as a PDF and also available in your account.' },
      outro: { es: 'Si algún dato no es correcto, respóndenos a este correo y lo revisamos.', en: 'If any detail is wrong, reply to this email and we will review it.' },
    },
  },
  {
    key: 'invite-registered', name: 'Invitación a un evento', description: 'Para invitados que ya tienen cuenta en Quinvite.',
    variables: [{ name: 'host', example: 'Familia Pérez' }, { name: 'event', example: 'Los XV de Valentina' }],
    texts: {
      subject: { es: ':host te invita a «:event»', en: ':host invites you to “:event”' },
      preheader: { es: 'Abre tu invitación y confirma tu asistencia.', en: 'Open your invitation and confirm your attendance.' },
      title: { es: 'Estás invitado', en: 'You are invited' },
      intro: { es: ':host quiere celebrar contigo «:event». Abre tu invitación para ver los detalles y confirmar si vienes.', en: ':host would love to celebrate “:event” with you. Open your invitation to see the details and let them know if you are coming.' },
      action: { es: 'Ver mi invitación', en: 'View my invitation' },
    },
  },
  {
    key: 'rsvp-confirmed', name: 'Asistencia confirmada', description: 'Resumen que recibe el invitado al confirmar su asistencia.',
    variables: [{ name: 'name', example: 'Tía Rosa' }, { name: 'event', example: 'Los XV de Valentina' }],
    texts: {
      subject: { es: 'Listo, :name: confirmamos tu asistencia', en: 'All set, :name: your attendance is confirmed' },
      title: { es: '¡Te esperamos!', en: 'We cannot wait to see you!' },
      intro: { es: 'Quedó registrada tu asistencia a «:event». Si algo cambia, puedes actualizar tu respuesta desde tu invitación.', en: 'Your attendance at “:event” is registered. If anything changes, you can update your answer from your invitation.' },
      action: { es: 'Ver mi invitación', en: 'View my invitation' },
    },
  },
  {
    key: 'collaborator-invite', name: 'Invitación a colaborar', description: 'Una organizadora invita a otra persona a ayudarle con el evento.',
    variables: [{ name: 'inviter', example: 'Marisol' }, { name: 'event', example: 'Los XV de Valentina' }],
    texts: {
      subject: { es: ':inviter te invitó a organizar «:event»', en: ':inviter invited you to help organize “:event”' },
      preheader: { es: 'Acepta para ver y editar el evento.', en: 'Accept to view and edit the event.' },
      title: { es: 'Ayuda con la organización', en: 'Help with the planning' },
      intro: { es: ':inviter te dio acceso a «:event» en Quinvite. Acepta la invitación para ver la lista de invitados y los detalles.', en: ':inviter gave you access to “:event” on Quinvite. Accept the invitation to see the guest list and the details.' },
      action: { es: 'Aceptar invitación', en: 'Accept invitation' },
    },
  },
  {
    key: 'payment-received', name: 'Pago recibido', description: 'Confirma el pago y desbloquea las funciones del evento completo.',
    variables: [{ name: 'event', example: 'Los XV de Valentina' }, { name: 'amount', example: '$149.00' }],
    texts: {
      subject: { es: 'Recibimos tu pago de :amount', en: 'We received your payment of :amount' },
      preheader: { es: 'Tu evento ya tiene todas las funciones.', en: 'Your event now has every feature.' },
      title: { es: 'Pago confirmado', en: 'Payment confirmed' },
      intro: { es: 'Recibimos :amount por «:event». Ya puedes enviar la invitación por WhatsApp y sumar invitados sin límite.', en: 'We received :amount for “:event”. You can now send the invitation on WhatsApp and add unlimited guests.' },
      action: { es: 'Ir a mi evento', en: 'Go to my event' },
    },
  },
  {
    key: 'admin-team-invite', name: 'Invitación al equipo del panel', description: 'Para personas del equipo interno; entra con enlace de un solo uso.',
    variables: [{ name: 'name', example: 'Lucía' }],
    texts: {
      subject: { es: 'Te dieron acceso al panel de Quinvite', en: 'You have been given access to the Quinvite panel' },
      title: { es: 'Hola, :name', en: 'Hi, :name' },
      intro: { es: 'Te agregamos al equipo del panel de administración. Usa el botón para crear tu contraseña; el enlace sirve una sola vez.', en: 'We added you to the admin panel team. Use the button to create your password; the link works only once.' },
      action: { es: 'Crear mi contraseña', en: 'Create my password' },
    },
  },
  {
    key: 'security-code', name: 'Código de verificación', description: 'Código de seis dígitos para confirmar un cambio sensible.',
    variables: [{ name: 'code', example: '482915' }, { name: 'minutes', example: '10' }],
    texts: {
      subject: { es: 'Tu código de Quinvite: :code', en: 'Your Quinvite code: :code' },
      title: { es: 'Código de verificación', en: 'Verification code' },
      intro: { es: 'Escribe este código para continuar: :code. Vence en :minutes minutos y no se lo compartas a nadie.', en: 'Enter this code to continue: :code. It expires in :minutes minutes; do not share it with anyone.' },
    },
  },
]

interface Override { text: string }
const overrides: Record<string, Record<Locale, Record<string, Override>>> = {}
const meta: Record<string, Record<Locale, { updatedAt: string; by: typeof ME } | null>> = {}
// A couple of edited messages, so the list and the editor show both states from the start.
const seed = (key: string, locale: Locale, field: string, text: string, ago: number) => {
  overrides[key] ??= { es: {}, en: {} }
  overrides[key][locale][field] = { text }
  meta[key] ??= { es: null, en: null }
  meta[key][locale] = { updatedAt: new Date(Date.now() - ago).toISOString(), by: ME }
}
seed('welcome', 'es', 'intro', 'Crea tu evento, elige una plantilla y comparte tu invitación por WhatsApp. Si necesitas ayuda, aquí estamos para ti.', 3 * 86_400_000)
seed('invoice', 'es', 'outro', 'Si algún dato de la factura no es correcto, respóndenos a este correo y la corregimos.', 9 * 86_400_000)
seed('invoice', 'en', 'outro', 'If any invoice detail is wrong, reply to this email and we will fix it.', 9 * 86_400_000)

const defOf = (key: string): Def => DEFS.find(d => d.key === key) ?? fail(404, { message: 'Not found.', code: 'message_not_found' })
const checkLocale = (locale: unknown): Locale => (locale === 'es' || locale === 'en' ? locale : failValidation({ locale: 'invalid' }))
const checkReason = (reason: unknown) => { if (typeof reason !== 'string' || reason.trim().length < REASON_MIN) failValidation({ reason: 'required' }) }
const store = (key: string, locale: Locale) => (overrides[key] ??= { es: {}, en: {} })[locale]

function detail(def: Def, locale: Locale): MessageDetail {
  const own = store(def.key, locale)
  const fields: MessageDetail['fields'] = {}
  for (const [name, t] of Object.entries(def.texts)) {
    fields[name] = { default: t[locale], current: own[name]?.text ?? t[locale], overridden: name in own, variables: extractVariables(t[locale]), maxLength: maxOf(name) }
  }
  const m = meta[def.key]?.[locale] ?? null
  return { key: def.key, name: def.name, locale, fields, variables: clone(def.variables), updatedAt: m?.updatedAt ?? null, updatedBy: m?.by ?? null }
}

/** Rules of the contract; keys are `fields.<name>`; codes are the contract's. */
function checkFields(def: Def, locale: Locale, fields: unknown): Record<string, string> {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return failValidation({ fields: 'required' })
  const e: Record<string, string> = {}
  for (const [name, value] of Object.entries(fields as Record<string, unknown>)) {
    const orig = def.texts[name]
    if (!orig) { e[`fields.${name}`] = 'not_editable'; continue }
    const text = typeof value === 'string' ? value : ''
    const required = extractVariables(orig[locale])
    if (!text.trim()) e[`fields.${name}`] = 'required'
    else if (text.length > maxOf(name)) e[`fields.${name}`] = 'too_long'
    else if (hasHtml(text)) e[`fields.${name}`] = 'html_not_allowed'
    else if (hasLink(text)) e[`fields.${name}`] = 'links_not_allowed'
    else if (missingVariables(text, required).length) e[`fields.${name}`] = 'missing_variable'
    else if (unknownVariables(text, required).length) e[`fields.${name}`] = 'unknown_variable'
  }
  return e
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Minimal markdown of the contract: **bold**, *italic* and line breaks. */
const md = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br>')
const fill = (s: string, vars: MessageVariable[]) => vars.reduce((acc, v) => acc.replace(new RegExp(`(?<![A-Za-z0-9_]):${v.name}\\b`, 'g'), v.example), s)

function render(def: Def, locale: Locale, texts: Record<string, string>): MessagePreview {
  const t = (f: string) => fill(texts[f] ?? '', def.variables)
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>`
    + '<body style="margin:0;background:#faf6f0;font-family:Arial,Helvetica,sans-serif;color:#2b2330">'
    + '<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="text-align:center;padding:8px 0 20px;font-size:22px;letter-spacing:1px;color:#b0446a">Quinvite</div>'
    + '<div style="background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #eadfd3">'
    + (texts.title ? `<h1 style="font-size:22px;margin:0 0 14px;font-family:Georgia,serif">${md(t('title'))}</h1>` : '')
    + (texts.intro ? `<p style="font-size:15px;line-height:1.55;margin:0 0 18px">${md(t('intro'))}</p>` : '')
    + (texts.action ? `<p style="text-align:center;margin:22px 0"><span style="display:inline-block;background:#b0446a;color:#fff;border-radius:8px;padding:12px 22px;font-weight:bold">${md(t('action'))}</span></p>` : '')
    + (texts.outro ? `<p style="font-size:13px;line-height:1.5;color:#6b6070;margin:18px 0 0">${md(t('outro'))}</p>` : '')
    + '</div><p style="text-align:center;font-size:12px;color:#8a7f8e;margin-top:18px">Celebrateitwithme LLC · Miami, FL</p></div></body></html>'
  return { subject: t('subject'), preheader: t('preheader'), html }
}

export async function listMessages(): Promise<Message[]> {
  await wait()
  return DEFS.map(d => ({
    key: d.key, name: d.name, description: d.description, locales: ['es', 'en'], editableFields: Object.keys(d.texts),
    overridden: { es: Object.keys(store(d.key, 'es')).length > 0, en: Object.keys(store(d.key, 'en')).length > 0 },
    updatedAt: [meta[d.key]?.es, meta[d.key]?.en].filter(Boolean).map(m => m!.updatedAt).sort().pop() ?? null,
  }))
}

export async function getMessage(key: string, locale: string): Promise<MessageDetail> {
  await wait()
  const def = defOf(key)
  return detail(def, checkLocale(locale))
}

export async function saveMessage(key: string, locale: string, fields: Record<string, string>, reason: string): Promise<MessageDetail> {
  await wait()
  await requireReauth()
  const def = defOf(key)
  const loc = checkLocale(locale)
  checkReason(reason)
  const errors = checkFields(def, loc, fields)
  if (Object.keys(errors).length) failValidation(errors)
  const own = store(key, loc)
  for (const [name, text] of Object.entries(fields)) {
    // A text equal to the original is no override.
    if (text === def.texts[name][loc]) delete own[name]
    else own[name] = { text }
  }
  ;(meta[key] ??= { es: null, en: null })[loc] = { updatedAt: new Date().toISOString(), by: ME }
  return detail(def, loc)
}

export async function restoreMessage(key: string, body: { locale: string; fields?: string[]; reason: string }): Promise<MessageDetail> {
  await wait()
  await requireReauth()
  const def = defOf(key)
  const loc = checkLocale(body.locale)
  checkReason(body.reason)
  const own = store(key, loc)
  for (const name of body.fields?.length ? body.fields : Object.keys(own)) delete own[name]
  if (!Object.keys(own).length && meta[key]) meta[key][loc] = null
  return detail(def, loc)
}

export async function previewMessage(key: string, body: { locale: string; fields?: Record<string, string> }): Promise<MessagePreview> {
  await wait(260)
  const def = defOf(key)
  const loc = checkLocale(body.locale)
  const edited = body.fields ?? {}
  const errors = checkFields(def, loc, edited)
  if (Object.keys(errors).length) failValidation(errors)
  const own = store(key, loc)
  const texts = Object.fromEntries(Object.entries(def.texts).map(([name, t]) => [name, edited[name] ?? own[name]?.text ?? t[loc]]))
  return render(def, loc, texts)
}

let testsSent: number[] = []
export async function sendTest(key: string, body: { locale: string; to?: string; reason: string }): Promise<{ sent: boolean }> {
  await wait(500)
  await requireReauth()
  defOf(key)
  checkLocale(body.locale)
  checkReason(body.reason)
  if (body.to && !STAFF.includes(body.to.toLowerCase())) failValidation({ to: 'not_staff' })
  const hourAgo = Date.now() - 60 * MINUTE
  testsSent = testsSent.filter(t => t > hourAgo)
  if (testsSent.length >= 5) fail(429, { message: 'Too Many Attempts.' })
  testsSent.push(Date.now())
  return { sent: true }
}
