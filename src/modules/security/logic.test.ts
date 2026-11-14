import { describe, expect, it } from 'vitest'
import { activationWarning, coveragePercent, coverageText, hiddenCount, pendingCount, switchError } from './logic'

describe('coverageText', () => {
  it.each([
    [0, 3, '0 de 3 personas ya tienen la verificación en dos pasos'],
    [1, 3, '1 de 3 personas ya tiene la verificación en dos pasos'],
    [3, 3, '3 de 3 personas ya tienen la verificación en dos pasos'],
    [1, 1, '1 de 1 persona ya tiene la verificación en dos pasos'],
  ])('%i of %i', (enrolled, total, text) => {
    expect(coverageText(enrolled, total)).toBe(text)
  })
})

describe('coveragePercent', () => {
  it('rounds, and treats an empty team as 0', () => {
    expect(coveragePercent(1, 3)).toBe(33)
    expect(coveragePercent(2, 3)).toBe(67)
    expect(coveragePercent(3, 3)).toBe(100)
    expect(coveragePercent(0, 0)).toBe(0)
  })
})

describe('pending and hidden counts', () => {
  const person = (id: number) => ({ id, name: `P${id}`, email: `p${id}@cwm.test` })
  it('counts who is missing, never below zero', () => {
    expect(pendingCount({ enrolled: 2, total: 5 })).toBe(3)
    expect(pendingCount({ enrolled: 6, total: 5 })).toBe(0)
  })
  it('counts the people the capped list leaves out', () => {
    expect(hiddenCount({ enrolled: 0, total: 60, notEnrolled: Array.from({ length: 50 }, (_, i) => person(i)) })).toBe(10)
    expect(hiddenCount({ enrolled: 1, total: 3, notEnrolled: [person(1), person(2)] })).toBe(0)
  })
})

describe('activationWarning', () => {
  it('tells what happens to those without it', () => {
    expect(activationWarning(1)).toBe('Hay 1 persona sin ella. Quien no la tenga solo podrá entrar a Mi cuenta hasta configurarla.')
    expect(activationWarning(4)).toContain('Hay 4 personas sin ella.')
    expect(activationWarning(0)).toContain('nadie se quedará fuera')
    expect(activationWarning(2)).toContain('solo podrá entrar a Mi cuenta')
  })
})

describe('switchError', () => {
  const api = (status: number, data: object) => ({ response: { status, data } })
  it('explains the lock-out protection', () => {
    expect(switchError(api(422, { code: 'own_two_factor_required' }))).toContain('activa tu propia verificación en dos pasos')
  })
  it('explains a missing re-authentication and a cancelled one', () => {
    expect(switchError(api(403, { code: 'reauth_required' }))).toBe('Confirma tu identidad para hacer este cambio.')
    expect(switchError({ reauthCancelled: true, response: { status: 403, data: { code: 'reauth_required' } } })).toContain('cancelaste la confirmación')
  })
  it('explains a missing reason, a plain 403 and anything else', () => {
    expect(switchError(api(422, { errors: { reason: ['The reason field is required.'] } }))).toBe('Escribe un motivo de al menos 5 caracteres.')
    expect(switchError(api(403, { message: 'This action is unauthorized.' }))).toBe('No tienes permiso para cambiar este ajuste.')
    expect(switchError(new Error('network'))).toBe('No pudimos cambiar el ajuste. Inténtalo de nuevo.')
    expect(switchError(undefined, 'Otro')).toBe('Otro')
  })
})
