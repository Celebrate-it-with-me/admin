import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { safeExternalUrl } from '../logic'
import CreditsTable from './CreditsTable.vue'
import type { AssetCredit } from '../types'

const credit = (url: string | null, over: Partial<AssetCredit> = {}): AssetCredit => ({ path: 'assets/a.webp', title: 'T', author: 'A', source: 'Origen', license: 'CC0', url, ...over })

describe('safeExternalUrl', () => {
  it.each([
    'javascript:alert(document.cookie)', ' javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:x', '//evil.example/x',
    'http://example.com/', 'https://user:pass@example.com/', 'https://user@example.com/', 'https://127.0.0.1/', 'https://127.0.0.1:8080/x', 'https://0x7f.0.0.1/',
    'https://2130706433/', 'https://[::1]/', 'https://localhost/', 'https://foo.localhost/', 'https://intranet/', 'https://printer.local/', 'https://10.0.0.5/',
    'https:///evil.example', 'https:\\\\evil.example', 'https://exa mple.com/', 'https://example.com/\u0000', '', '   ', 'mailto:a@b.co', 'ftp://example.com/',
  ])('refuses %j', raw => { expect(safeExternalUrl(raw)).toBeNull() })

  it('refuses non-strings and very long values', () => {
    expect(safeExternalUrl(null)).toBeNull()
    expect(safeExternalUrl(undefined)).toBeNull()
    expect(safeExternalUrl({ toString: () => 'https://example.com' })).toBeNull()
    expect(safeExternalUrl(`https://example.com/${'a'.repeat(3000)}`)).toBeNull()
  })

  it('accepts a plain https URL', () => {
    expect(safeExternalUrl('https://unsplash.com/photos/abc')).toBe('https://unsplash.com/photos/abc')
    expect(safeExternalUrl(' https://Example.com/a?b=1#c ')).toBe('https://example.com/a?b=1#c')
  })
})

describe('CreditsTable', () => {
  it('links only a safe https URL, with target and rel', () => {
    const w = mount(CreditsTable, { props: { credits: [credit('https://unsplash.com/photos/abc')] } })
    const a = w.find('a')
    expect(a.attributes('href')).toBe('https://unsplash.com/photos/abc')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer')
  })

  it.each(['javascript:alert(1)', 'data:text/html,x', '//evil.example', 'https://user:pass@x.com/', 'https://127.0.0.1/', 'https://localhost/'])('shows %s as plain text, with no link', url => {
    const w = mount(CreditsTable, { props: { credits: [credit(url, { source: 'Fuente <b>x</b>' })] } })
    expect(w.find('a').exists()).toBe(false)
    expect(w.html()).not.toContain(url.startsWith('//') ? 'href="//' : 'href=')
    expect(w.text()).toContain('Fuente <b>x</b>')
    expect(w.find('b').exists()).toBe(false)
  })

  it('shows author, title and license from the package as text, never as HTML', () => {
    const w = mount(CreditsTable, { props: { credits: [credit(null, { title: '<img src=x onerror=alert(1)>', author: '<script>alert(1)</script>' })] } })
    expect(w.find('img').exists()).toBe(false)
    expect(w.find('script').exists()).toBe(false)
    expect(w.text()).toContain('<img src=x onerror=alert(1)>')
  })
})
