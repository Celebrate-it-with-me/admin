import { describe, expect, it } from 'vitest'
import {
  actionsFor, checkNewPassword, countByStatus, emailLooksValid, expiryLabel, fieldErrors, filterMembers, inviteLoadFailure,
  isLastSuperadmin, isSelf, lastLoginLabel, parseTeamError, readAcceptResult, statusView,
} from './logic'
import type { Member } from './types'

const NOW = Date.parse('2026-11-14T12:00:00Z')
const H = 3_600_000
const D = 24 * H
const iso = (offset: number) => new Date(NOW + offset).toISOString()

const member = (over: Partial<Member> = {}): Member => ({
  id: 1, name: 'Ana Soporte', email: 'ana@cwm.test', role: 'support', status: 'active', lastLoginAt: iso(-3 * D), twoFactorEnabled: true, invitation: null, ...over,
})
const invited = (expiresIn: number, over: Partial<Member['invitation'] & object> = {}): Member =>
  member({ id: 9, status: 'invited', lastLoginAt: null, twoFactorEnabled: false, invitation: { sentAt: iso(-D), expiresAt: iso(expiresIn), resendCount: 0, expired: false, ...over } })

describe('expiryLabel', () => {
  it('counts days, hours and the last hour', () => {
    expect(expiryLabel(iso(2 * D + H), NOW)).toBe('vence en 2 días')
    expect(expiryLabel(iso(2 * D - 5000), NOW)).toBe('vence en 2 días')
    expect(expiryLabel(iso(D), NOW)).toBe('vence en 1 día')
    expect(expiryLabel(iso(5 * H + 10), NOW)).toBe('vence en 5 horas')
    expect(expiryLabel(iso(H + 1), NOW)).toBe('vence en 1 hora')
    expect(expiryLabel(iso(20 * 60_000), NOW)).toBe('vence en menos de una hora')
  })
  it('says Vencida once the date passed, or when there is no valid date', () => {
    expect(expiryLabel(iso(-1), NOW)).toBe('Vencida')
    expect(expiryLabel(null, NOW)).toBe('Vencida')
    expect(expiryLabel('nonsense', NOW)).toBe('Vencida')
  })
})

describe('lastLoginLabel', () => {
  it('says she never signed in', () => {
    expect(lastLoginLabel(null)).toBe('Nunca ha entrado')
  })
  it('is relative up to a month, then months, then a date', () => {
    expect(lastLoginLabel(iso(-20_000), NOW)).toBe('Ahora mismo')
    expect(lastLoginLabel(iso(-5 * 60_000), NOW)).toBe('hace 5 min')
    expect(lastLoginLabel(iso(-H), NOW)).toBe('hace 1 hora')
    expect(lastLoginLabel(iso(-3 * D), NOW)).toBe('hace 3 días')
    expect(lastLoginLabel(iso(-75 * D), NOW)).toBe('hace 2 meses')
    expect(lastLoginLabel(iso(-400 * D), NOW)).toMatch(/2025/)
  })
  it('does not go negative for a clock that is a bit ahead', () => {
    expect(lastLoginLabel(iso(5 * 60_000), NOW)).toBe('Ahora mismo')
  })
})

describe('statusView', () => {
  it('active has no note', () => {
    expect(statusView(member(), NOW)).toMatchObject({ label: 'Activo', color: 'success', note: '' })
  })
  it('invited shows when it expires', () => {
    expect(statusView(invited(2 * D + H), NOW)).toMatchObject({ label: 'Invitado', color: 'info', note: 'vence en 2 días', noteTone: 'muted' })
  })
  it('an invitation is Vencida by its flag or by its date', () => {
    expect(statusView(invited(D, { expired: true }), NOW)).toMatchObject({ label: 'Invitado', note: 'Vencida', noteTone: 'error', color: 'warning' })
    expect(statusView(invited(-D), NOW).note).toBe('Vencida')
  })
  it('suspended', () => {
    expect(statusView(member({ status: 'suspended' }), NOW)).toMatchObject({ label: 'Suspendido', color: 'error' })
  })
})

describe('actionsFor', () => {
  const me = { id: 100, email: 'admin@cwm.test' }
  const keys = (m: Member, all: Member[] = [m, member({ id: 50, role: 'superadmin', email: 'a@x.co' }), member({ id: 51, role: 'superadmin', email: 'b@x.co' })]) =>
    actionsFor(m, all, me).map(a => a.key)

  it('invited: resend and revoke only', () => {
    expect(keys(invited(D))).toEqual(['resend', 'revoke'])
  })
  it('active: role, suspend, reset two-factor (only when she has it), remove', () => {
    expect(keys(member())).toEqual(['role', 'suspend', 'twofactor', 'remove'])
    expect(keys(member({ twoFactorEnabled: false }))).toEqual(['role', 'suspend', 'remove'])
  })
  it('suspended: reactivate and remove', () => {
    expect(keys(member({ status: 'suspended' }))).toEqual(['reactivate', 'remove'])
  })
  it('everything on your own row is disabled with the reason', () => {
    const own = member({ id: 100, email: 'admin@cwm.test', role: 'superadmin' })
    const actions = actionsFor(own, [own, member({ id: 50, role: 'superadmin' })], me)
    expect(actions.every(a => a.disabled && a.hint === 'No puedes hacerlo sobre tu propia cuenta.')).toBe(true)
  })
  it('the only active superadmin cannot be demoted, suspended or removed, but her two-factor can be reset', () => {
    const last = member({ id: 7, role: 'superadmin' })
    const actions = actionsFor(last, [last, member({ id: 8 }), member({ id: 9, role: 'superadmin', status: 'suspended' })], me)
    const disabled = Object.fromEntries(actions.map(a => [a.key, !!a.disabled]))
    expect(disabled).toEqual({ role: true, suspend: true, twofactor: false, remove: true })
    expect(actions[0].hint).toBe('Es la única persona superadmin activa.')
  })
  it('notes how many times the invitation was resent', () => {
    expect(actionsFor(invited(D, { resendCount: 2 }), [], me)[0].hint).toBe('Ya la reenviaste 2 veces.')
  })
})

describe('isSelf / isLastSuperadmin', () => {
  it('matches by id or by email, ignoring case', () => {
    expect(isSelf({ id: 3, email: 'x@y.co' }, { id: 3 })).toBe(true)
    expect(isSelf({ id: 3, email: 'Admin@CWM.test' }, { id: 99, email: 'admin@cwm.test' })).toBe(true)
    expect(isSelf({ id: 3, email: 'x@y.co' }, {})).toBe(false)
  })
  it('counts only active superadmins', () => {
    const a = member({ id: 1, role: 'superadmin' })
    expect(isLastSuperadmin(a, [a, member({ id: 2, role: 'superadmin', status: 'suspended' })])).toBe(true)
    expect(isLastSuperadmin(a, [a, member({ id: 2, role: 'superadmin' })])).toBe(false)
  })
})

describe('filters', () => {
  const all = [
    member({ id: 1, name: 'Ana Soporte', email: 'ana@cwm.test' }),
    member({ id: 2, name: 'Álvaro Núñez', email: 'alvaro@cwm.test', role: 'superadmin' }),
    member({ id: 3, name: 'Carlos Ruiz', email: 'carlos@cwm.test', status: 'invited' }),
    member({ id: 4, name: 'Elena', email: 'elena@cwm.test', status: 'suspended' }),
  ]
  const none = { search: '', status: null, role: null }
  it('searches name and email without caring for accents or case', () => {
    expect(filterMembers(all, { ...none, search: 'alvaro' }).map(m => m.id)).toEqual([2])
    expect(filterMembers(all, { ...none, search: ' NUNEZ ' }).map(m => m.id)).toEqual([2])
    expect(filterMembers(all, { ...none, search: 'carlos@' }).map(m => m.id)).toEqual([3])
  })
  it('combines status and role', () => {
    expect(filterMembers(all, { ...none, status: 'active', role: 'superadmin' }).map(m => m.id)).toEqual([2])
    expect(filterMembers(all, { ...none, status: 'suspended' }).map(m => m.id)).toEqual([4])
  })
  it('counts by status', () => {
    expect(countByStatus(all)).toEqual({ active: 2, invited: 1, suspended: 1 })
  })
})

describe('emailLooksValid', () => {
  it('accepts a plain address and rejects the rest', () => {
    expect(emailLooksValid(' ana@cwm.test ')).toBe(true)
    expect(emailLooksValid('ana@')).toBe(false)
    expect(emailLooksValid('ana cwm.test')).toBe(false)
  })
})

describe('parseTeamError', () => {
  const v = (field: string, code: string) => ({ response: { status: 422, data: { message: 'x', errors: { [field]: [code] } } } })
  const c = (status: number, code: string) => ({ response: { status, data: { message: 'x', code } } })

  it('maps each 422 code of the contract (errors.<field>[0])', () => {
    expect(parseTeamError(v('email', 'already_staff')).message).toBe('Esa persona ya está en el equipo.')
    expect(parseTeamError(v('email', 'invitation_pending'))).toMatchObject({ code: 'invitation_pending', field: 'email' })
    expect(parseTeamError(v('name', 'name_required'))).toMatchObject({ code: 'name_required', field: 'name' })
    expect(parseTeamError(v('user', 'last_superadmin')).message).toContain('única persona superadmin activa')
    expect(parseTeamError(v('user', 'cannot_change_self')).message).toBe('No puedes hacerlo sobre tu propia cuenta.')
    expect(parseTeamError(v('user', 'resend_limit')).message).toContain('máximo de veces')
    expect(parseTeamError(v('reason', 'reason')).message).toContain('al menos 5 caracteres')
  })
  it('maps the 403/404/409/410 codes (code)', () => {
    expect(parseTeamError(c(404, 'invitation_invalid')).message).toContain('ya no existe')
    expect(parseTeamError(c(404, 'member_not_found')).message).toBe('Esta persona ya no está en la lista.')
    expect(parseTeamError(c(410, 'invitation_expired')).code).toBe('invitation_expired')
    expect(parseTeamError(c(409, 'two_factor_not_enabled')).message).toContain('no tiene la verificación')
    expect(parseTeamError(c(403, 'two_factor_required_to_reset')).message).toContain('activa primero los tuyos')
    expect(parseTeamError(c(403, 'account_suspended')).message).toBe('Esta cuenta está suspendida.')
  })
  it('handles cancelled re-authentication, no connection, limits and the unknown', () => {
    expect(parseTeamError({ reauthCancelled: true }).message).toContain('cancelaste')
    expect(parseTeamError(new Error('Network Error')).message).toContain('No hay conexión')
    expect(parseTeamError({ response: { status: 429, data: {} } }).message).toContain('Demasiados intentos')
    expect(parseTeamError({ response: { status: 403, data: {} } }).message).toBe('No tienes permiso para hacer esto.')
    expect(parseTeamError({ response: { status: 500, data: {} } }).message).toBe('No pudimos hacerlo. Inténtalo de nuevo.')
  })
  it('lets a 422 text that is not a code through (it is already in Spanish)', () => {
    expect(parseTeamError(v('password', 'La contraseña es muy corta.')).message).toBe('La contraseña es muy corta.')
  })
})

describe('fieldErrors', () => {
  it('turns codes into Spanish per field', () => {
    const e = { response: { status: 422, data: { errors: { current_password: ['invalid_current_password'], password: ['Muy corta.', 'Otra.'] } } } }
    expect(fieldErrors(e)).toEqual({ current_password: 'La contraseña actual no es correcta.', password: 'Muy corta.' })
    expect(fieldErrors(new Error('x'))).toEqual({})
  })
})

describe('inviteLoadFailure', () => {
  it('tells invalid, expired, offline and the rest apart', () => {
    expect(inviteLoadFailure({ response: { status: 404, data: { code: 'invitation_invalid' } } })).toBe('invalid')
    expect(inviteLoadFailure({ response: { status: 410, data: { code: 'invitation_expired' } } })).toBe('expired')
    expect(inviteLoadFailure(new Error('Network Error'))).toBe('network')
    expect(inviteLoadFailure({ response: { status: 500, data: {} } })).toBe('error')
  })
})

describe('checkNewPassword', () => {
  it('asks for 12 characters and a matching repetition', () => {
    expect(checkNewPassword('short', 'short')).toEqual({ longEnough: false, matches: true, ok: false })
    expect(checkNewPassword('a-long-enough-one', 'a-long-enough-two')).toMatchObject({ longEnough: true, matches: false, ok: false })
    expect(checkNewPassword('a-long-enough-one', 'a-long-enough-one').ok).toBe(true)
    expect(checkNewPassword('', '').ok).toBe(false)
  })
})

describe('readAcceptResult', () => {
  it('reads the session answer', () => {
    expect(readAcceptResult({ data: { token: 't', twoFactorSetupRequired: true, user: { id: 1 } } })).toEqual({ kind: 'session', token: 't', twoFactorSetupRequired: true })
    expect(readAcceptResult({ data: { token: 't' } })).toMatchObject({ kind: 'session', twoFactorSetupRequired: false })
  })
  it('reads the challenge answer (no data)', () => {
    expect(readAcceptResult({ twoFactorRequired: true, challenge: 'abc' })).toEqual({ kind: 'challenge', challenge: 'abc' })
  })
  it('refuses anything else', () => {
    expect(readAcceptResult('plain-token')).toBeNull()
    expect(readAcceptResult({})).toBeNull()
    expect(readAcceptResult(null)).toBeNull()
  })
})
