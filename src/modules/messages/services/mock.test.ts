import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/reauth', () => ({ askReauth: vi.fn().mockResolvedValue(undefined) }))
const m = await import('./mock')

const code = async (p: Promise<unknown>) => {
  try { await p } catch (e) { return (e as { response: { status: number; data: { code?: string; errors?: Record<string, string[]> } } }).response }
  return null
}
const REASON = 'Prueba de texto'

describe('messages mock', () => {
  it('lists 8 to 10 messages with the contract shape', async () => {
    const list = await m.listMessages()
    expect(list.length).toBeGreaterThanOrEqual(8)
    expect(list.length).toBeLessThanOrEqual(10)
    expect(list[0]).toMatchObject({ key: 'confirm', locales: ['es', 'en'], overridden: { es: false, en: false }, updatedAt: null })
    expect(list.find(x => x.key === 'invoice')!.overridden).toEqual({ es: true, en: true })
    expect(list.find(x => x.key === 'welcome')!.overridden).toEqual({ es: true, en: false })
  })

  it('returns the detail with default, current, variables and limits', async () => {
    const d = await m.getMessage('reset-password', 'es')
    expect(d.fields.subject).toMatchObject({ overridden: false, maxLength: 150, variables: [] })
    expect(d.fields.intro.variables).toEqual(['minutes'])
    expect(d.variables.map(v => v.name)).toEqual(['name', 'minutes'])
  })

  it('answers 404 for an unknown key and 422 for a bad locale', async () => {
    expect((await code(m.getMessage('nope', 'es')))?.data.code).toBe('message_not_found')
    expect((await code(m.getMessage('confirm', 'fr')))?.data.errors).toEqual({ locale: ['invalid'] })
    expect((await code(m.previewMessage('nope', { locale: 'es' })))?.status).toBe(404)
  })

  it('validates every field rule with the contract codes', async () => {
    const save = async (fields: Record<string, string>) => (await code(m.saveMessage('confirm', 'es', fields, REASON)))?.data.errors
    expect(await save({ subject: ' ' })).toEqual({ 'fields.subject': ['required'] })
    expect(await save({ subject: ':name ' + 'x'.repeat(150) })).toEqual({ 'fields.subject': ['too_long'] })
    expect(await save({ subject: 'Hola' })).toEqual({ 'fields.subject': ['missing_variable'] })
    expect(await save({ subject: 'Hola :name :otro' })).toEqual({ 'fields.subject': ['unknown_variable'] })
    expect(await save({ subject: '<b>Hola</b> :name' })).toEqual({ 'fields.subject': ['html_not_allowed'] })
    expect(await save({ subject: 'Hola :name https://x.com' })).toEqual({ 'fields.subject': ['links_not_allowed'] })
    expect(await save({ color: 'rojo' })).toEqual({ 'fields.color': ['not_editable'] })
    expect((await code(m.saveMessage('confirm', 'es', { subject: 'Hola :name' }, 'no')))?.data.errors).toEqual({ reason: ['required'] })
  })

  it('previews without saving, with the same 422 as PUT, and fills the examples', async () => {
    const p = await m.previewMessage('confirm', { locale: 'es', fields: { subject: 'Un saludo, :name', intro: 'Primera línea\n**Segunda**' } })
    expect(p.subject).toBe('Un saludo, Marisol')
    expect(p.html).toContain('<strong>Segunda</strong>')
    expect((await m.getMessage('confirm', 'es')).fields.subject.overridden).toBe(false)
    expect((await code(m.previewMessage('confirm', { locale: 'es', fields: { subject: 'sin variable' } })))?.data.errors).toEqual({ 'fields.subject': ['missing_variable'] })
  })

  it('escapes HTML in what is rendered', async () => {
    // The API would have refused it; the renderer escapes anyway.
    const p = await m.previewMessage('confirm', { locale: 'en', fields: { title: 'Hi 2 < 3, :name' } })
    expect(p.html).toContain('2 &lt; 3, Marisol')
  })

  it('saves an override, restores one field, then the whole language', async () => {
    const saved = await m.saveMessage('welcome', 'en', { title: 'Great to have you, :name', action: 'Start my event' }, REASON)
    expect(saved.fields.title).toMatchObject({ overridden: true, current: 'Great to have you, :name' })
    expect(saved.updatedBy).toMatchObject({ id: 1 })
    expect((await m.listMessages()).find(x => x.key === 'welcome')!.overridden.en).toBe(true)
    const one = await m.restoreMessage('welcome', { locale: 'en', fields: ['title'], reason: REASON })
    expect(one.fields.title.overridden).toBe(false)
    expect(one.fields.action.overridden).toBe(true)
    const all = await m.restoreMessage('welcome', { locale: 'en', reason: REASON })
    expect(Object.values(all.fields).some(f => f.overridden)).toBe(false)
  })

  it('refuses a test to a non-staff address and limits tests to 5 per hour', async () => {
    expect((await code(m.sendTest('confirm', { locale: 'es', to: 'alguien@gmail.com', reason: REASON })))?.data.errors).toEqual({ to: ['not_staff'] })
    for (let i = 0; i < 5; i++) expect(await m.sendTest('confirm', { locale: 'es', reason: REASON })).toEqual({ sent: true })
    expect((await code(m.sendTest('confirm', { locale: 'es', reason: REASON })))?.status).toBe(429)
  })
})
