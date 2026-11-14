import { describe, expect, it } from 'vitest'
import {
  changedFields, extractVariables, fieldLabel, fieldMessage, formFrom, hasHtml, hasLink, isEdited, matchesSearch, missingVariables, parseError,
  serverFieldErrors, unknownVariables, validateField, validateForm,
} from './logic'
import type { FieldDetail, Message } from './types'

const field = (over: Partial<FieldDetail> = {}): FieldDetail => ({ default: 'Hola :name, tu factura :number', current: 'Hola :name, tu factura :number', overridden: false, variables: ['name', 'number'], maxLength: 150, ...over })

describe('variables', () => {
  it('extracts the markers once, in order, and ignores colons glued to words', () => {
    expect(extractVariables('Hola :name, :number y :name otra vez. Nota:algo, https://x.com, a las 10:30')).toEqual(['name', 'number'])
  })
  it('finds the ones that are missing and the ones that are new', () => {
    expect(missingVariables('Hola :name', ['name', 'number'])).toEqual(['number'])
    expect(unknownVariables('Hola :name :otra', ['name'])).toEqual(['otra'])
  })
})

describe('format', () => {
  it('detects HTML and hand-written links, but not minimal markdown', () => {
    expect(hasHtml('Hola <b>tú</b>')).toBe(true)
    expect(hasHtml('2 < 3 y 5 > 4')).toBe(false)
    expect(hasHtml('**negrita** y *cursiva*\nlínea')).toBe(false)
    expect(hasLink('Entra a https://quinvite.com')).toBe(true)
    expect(hasLink('Visita www.quinvite.com')).toBe(true)
    expect(hasLink('[aquí](/x)')).toBe(true)
    expect(hasLink('Escríbenos a mailto:a@b.c')).toBe(true)
    expect(hasLink('Hola, sin enlaces')).toBe(false)
  })
})

describe('validateField', () => {
  const f = field()
  it('follows the contract codes', () => {
    expect(validateField('   ', f)).toBe('required')
    expect(validateField(`:name :number ${'x'.repeat(150)}`, f)).toBe('too_long')
    expect(validateField('<p>:name :number</p>', f)).toBe('html_not_allowed')
    expect(validateField(':name :number https://x.com', f)).toBe('links_not_allowed')
    expect(validateField('Hola :name', f)).toBe('missing_variable')
    expect(validateField(':name :number :otra', f)).toBe('unknown_variable')
    expect(validateField('Hola :name, la factura :number', f)).toBeNull()
  })
})

describe('forms', () => {
  const fields = { subject: field(), title: field({ default: 'Hola', current: 'Hola', variables: [] }) }
  it('builds the form from the current texts and only reports what changed', () => {
    const form = formFrom(fields)
    expect(form).toEqual({ subject: 'Hola :name, tu factura :number', title: 'Hola' })
    expect(changedFields(form, fields)).toEqual({})
    form.subject = ':name'
    form.title = 'Qué tal'
    expect(changedFields(form, fields)).toEqual({ subject: ':name', title: 'Qué tal' })
    expect(validateForm(form, fields)).toEqual({ subject: 'missing_variable' })
  })
})

describe('messages', () => {
  it('names the missing and the new variables', () => {
    const f = field()
    expect(fieldMessage('missing_variable', { text: 'Hola :name', field: f })).toContain(':number')
    expect(fieldMessage('unknown_variable', { text: ':name :number :x', field: f })).toContain(':x')
    expect(fieldMessage('too_long', { field: f })).toBe('Máximo 150 caracteres.')
    expect(fieldMessage('links_not_allowed')).toContain('enlaces')
  })
  it('labels the known fields and tolerates others', () => {
    expect(fieldLabel('subject')).toBe('Asunto')
    expect(fieldLabel('footer_note')).toBe('Footer note')
  })
  it('reads the field errors of a 422, with or without the fields. prefix', () => {
    const e = { response: { status: 422, data: { errors: { 'fields.subject': ['missing_variable'], reason: ['required'] } } } }
    expect(serverFieldErrors(e)).toEqual({ subject: 'missing_variable', reason: 'required' })
  })
  it('turns errors into Spanish sentences', () => {
    expect(parseError({ response: { status: 404, data: { code: 'message_not_found' } } }).code).toBe('message_not_found')
    expect(parseError({ response: { status: 429, data: {} } }).message).toContain('5 pruebas por hora')
    expect(parseError({ response: { status: 422, data: { errors: { to: ['not_staff'] } } } })).toMatchObject({ field: 'to', code: 'not_staff' })
    expect(parseError({ reauthCancelled: true }).message).toContain('cancelaste')
    expect(parseError({}).message).toContain('conexión')
  })
})

describe('list helpers', () => {
  const m: Message = { key: 'reset-password', name: 'Restablecer contraseña', description: 'Enlace', locales: ['es', 'en'], editableFields: [], overridden: { es: true, en: false }, updatedAt: null }
  it('knows which language was edited and searches by name, key and description', () => {
    expect(isEdited(m, 'es')).toBe(true)
    expect(isEdited(m, 'en')).toBe(false)
    expect(matchesSearch(m, 'contraseña')).toBe(true)
    expect(matchesSearch(m, 'RESET')).toBe(true)
    expect(matchesSearch(m, 'factura')).toBe(false)
    expect(matchesSearch(m, '  ')).toBe(true)
  })
})
