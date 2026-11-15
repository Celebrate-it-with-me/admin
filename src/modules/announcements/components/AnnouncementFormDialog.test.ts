import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { bodyText, mountUi } from '@/test/mount'
import type { Announcement } from '../types'
import AnnouncementFormDialog from './AnnouncementFormDialog.vue'

const api = vi.hoisted(() => ({ createAnnouncement: vi.fn(), updateAnnouncement: vi.fn(), previewAudience: vi.fn() }))
vi.mock('../services/announcementsApi', () => api)

const existing = (over: Partial<Announcement> = {}): Announcement => ({
  id: 7, level: 'news', titleEs: 'Título', titleEn: 'Title', bodyEs: 'Cuerpo', bodyEn: 'Body', ctaLabelEs: null, ctaLabelEn: null, ctaUrl: null, dismissible: true,
  audience: 'all', upcomingDays: null, startsAt: '2027-03-10T14:00:00.000Z', endsAt: null, isActive: true, status: 'active', dismissedCount: 0, createdAt: '', updatedAt: '', ...over,
})

const mountForm = async (announcement: Announcement | null = null) => {
  const w = mountUi(AnnouncementFormDialog, { props: { modelValue: false, announcement } })
  await w.setProps({ modelValue: true })
  await flushPromises()
  return w
}

const input = (label: string): HTMLInputElement | HTMLTextAreaElement => {
  const l = Array.from(document.body.querySelectorAll<HTMLLabelElement>('label[for]')).find(x => x.textContent?.trim().startsWith(label))
  if (!l) throw new Error(`no field ${label}`)
  return document.getElementById(l.htmlFor) as HTMLInputElement
}
const type = async (label: string, value: string) => { const el = input(label); el.value = value; el.dispatchEvent(new Event('input')); await nextTick() }
const button = (label: string) => Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(b => b.textContent?.trim() === label)!
const click = async (label: string) => { button(label).click(); await flushPromises(); await nextTick() }
const tab = async (lang: 'es' | 'en') => { document.body.querySelector<HTMLElement>(`[data-tab="${lang}"]`)!.click(); await flushPromises() }
const reasonDialog = () => Array.from(document.body.querySelectorAll('.v-dialog')).find(d => d.textContent?.includes('Queda registrado en la auditoría'))

const fillAll = async () => {
  await type('Título (español)', 'Hola')
  await type('Texto (español)', 'Mensaje')
  await tab('en')
  await type('Título (inglés)', 'Hello')
  await type('Texto (inglés)', 'Message')
}

beforeEach(() => { Object.values(api).forEach(fn => fn.mockReset()); api.previewAudience.mockResolvedValue(482) })
afterEach(() => { document.body.innerHTML = '' })

describe('AnnouncementFormDialog', () => {
  it('opens empty for a new announcement, with the contract defaults', async () => {
    const w = await mountForm()
    expect(bodyText()).toContain('Nuevo anuncio')
    expect((input('Título (español)')).value).toBe('')
    expect(bodyText()).toContain('Crear anuncio')
    w.unmount()
  })

  it('does not ask for the reason while something is missing, and marks the language tab', async () => {
    const w = await mountForm()
    await click('Crear anuncio')
    expect(reasonDialog()).toBeUndefined()
    expect(bodyText()).toContain('Este campo es obligatorio.')
    expect(document.body.querySelector('[data-tab="es"] .mdi-alert-circle')).not.toBeNull()
    expect(document.body.querySelector('[data-tab="en"] .mdi-alert-circle')).not.toBeNull()
    expect(api.createAnnouncement).not.toHaveBeenCalled()
    w.unmount()
  })

  it('shows a text over its limit at once, with the limit', async () => {
    const w = await mountForm()
    await type('Título (español)', 'x'.repeat(81))
    expect(bodyText()).toContain('Máximo 80 caracteres.')
    expect(bodyText()).toContain('81 / 80')
    w.unmount()
  })

  it('creates with the reason and a snake_case body, then reports it', async () => {
    api.createAnnouncement.mockResolvedValue(existing({ id: 9 }))
    const w = await mountForm()
    await fillAll()
    await click('Crear anuncio')
    expect(reasonDialog()).toBeDefined()
    const reason = document.body.querySelector<HTMLTextAreaElement>('textarea[autofocus], .v-dialog textarea')!
    const area = Array.from(document.body.querySelectorAll<HTMLTextAreaElement>('textarea')).find(t => t.closest('.v-dialog')?.textContent?.includes('Queda registrado'))!
    expect(reason).toBeTruthy()
    area.value = 'abc'; area.dispatchEvent(new Event('input')); await nextTick()
    await click('Crear')
    expect(api.createAnnouncement).not.toHaveBeenCalled()
    area.value = 'Campaña de marzo'; area.dispatchEvent(new Event('input')); await nextTick()
    await click('Crear')
    expect(api.createAnnouncement).toHaveBeenCalledTimes(1)
    const [body, why] = api.createAnnouncement.mock.calls[0]
    expect(why).toBe('Campaña de marzo')
    expect(body).toMatchObject({ level: 'info', title_es: 'Hola', title_en: 'Hello', body_es: 'Mensaje', body_en: 'Message', audience: 'all', dismissible: true, is_active: true, cta_url: null, ends_at: null })
    expect(w.emitted('saved')![0][1]).toBe('created')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([false])
    w.unmount()
  })

  it('edits an existing one with PUT semantics', async () => {
    api.updateAnnouncement.mockResolvedValue(existing())
    const w = await mountForm(existing())
    expect(bodyText()).toContain('Editar anuncio')
    expect(input('Título (español)').value).toBe('Título')
    await click('Guardar cambios')
    const area = Array.from(document.body.querySelectorAll<HTMLTextAreaElement>('textarea')).find(t => t.closest('.v-dialog')?.textContent?.includes('Queda registrado'))!
    area.value = 'Corrijo el texto'; area.dispatchEvent(new Event('input')); await nextTick()
    await click('Guardar')
    expect(api.updateAnnouncement).toHaveBeenCalledWith(7, expect.objectContaining({ title_es: 'Título' }), 'Corrijo el texto')
    expect(w.emitted('saved')![0][1]).toBe('updated')
    w.unmount()
  })

  it('previews the banner as plain text, in each language', async () => {
    const w = await mountForm()
    await type('Texto (español)', '<b>Hola</b>\nsegunda línea')
    const preview = () => document.body.querySelector<HTMLElement>('.banner')!
    expect(preview().innerHTML).not.toContain('<b>')
    expect(preview().textContent).toContain('<b>Hola</b>')
    await tab('en')
    await type('Título (inglés)', 'Hello there')
    expect(preview().textContent).not.toContain('Hello there')
    document.body.querySelector<HTMLElement>('[data-preview-lang="en"]')!.click(); await flushPromises()
    expect(preview().textContent).toContain('Hello there')
    w.unmount()
  })

  it('shows the button in the preview only with URL and its label', async () => {
    const w = await mountForm()
    await type('Dirección del botón', '/dashboard/guests')
    expect(document.body.querySelector('.banner__cta')).toBeNull()
    await type('Etiqueta del botón (español)', 'Ver invitados')
    expect(document.body.querySelector('.banner__cta')?.textContent).toBe('Ver invitados')
    w.unmount()
  })

  it('counts the audience live, with days only for the upcoming-event audience', async () => {
    const w = await mountForm()
    await new Promise(r => setTimeout(r, 450)); await flushPromises()
    expect(api.previewAudience).toHaveBeenCalledWith({ audience: 'all' })
    expect(document.body.querySelector('[data-count]')!.textContent).toContain('482 organizadoras')
    api.previewAudience.mockResolvedValue(42)
    document.body.querySelector<HTMLInputElement>('[data-audience="upcoming_event"] input')!.click()
    await flushPromises()
    expect(input('Días hasta el evento')).toBeTruthy()
    await type('Días hasta el evento', '14')
    await new Promise(r => setTimeout(r, 450)); await flushPromises()
    expect(api.previewAudience).toHaveBeenLastCalledWith({ audience: 'upcoming_event', upcoming_days: 14 })
    expect(document.body.querySelector('[data-count]')!.textContent).toContain('42 organizadoras')
    w.unmount()
  })

  it('maps a server 422 to its field and language tab, and closes the reason dialog', async () => {
    api.createAnnouncement.mockRejectedValue({ response: { status: 422, data: { errors: { title_en: ['too_long'] } } } })
    const w = await mountForm()
    await fillAll()
    await tab('es')
    await click('Crear anuncio')
    const area = Array.from(document.body.querySelectorAll<HTMLTextAreaElement>('textarea')).find(t => t.closest('.v-dialog')?.textContent?.includes('Queda registrado'))!
    area.value = 'Campaña de marzo'; area.dispatchEvent(new Event('input')); await nextTick()
    await click('Crear')
    expect(bodyText()).toContain('Máximo 80 caracteres.')
    expect(bodyText()).toContain('Revisa los campos marcados.')
    expect(document.body.querySelector('[data-tab="en"] .mdi-alert-circle')).not.toBeNull()
    expect(w.emitted('saved')).toBeUndefined()
    w.unmount()
  })

  it('tells the list when the announcement is gone (404)', async () => {
    api.updateAnnouncement.mockRejectedValue({ response: { status: 404, data: { code: 'announcement_not_found' } } })
    const w = await mountForm(existing())
    await click('Guardar cambios')
    const area = Array.from(document.body.querySelectorAll<HTMLTextAreaElement>('textarea')).find(t => t.closest('.v-dialog')?.textContent?.includes('Queda registrado'))!
    area.value = 'Corrijo el texto'; area.dispatchEvent(new Event('input')); await nextTick()
    await click('Guardar')
    expect(w.emitted('gone')).toHaveLength(1)
    w.unmount()
  })
})
