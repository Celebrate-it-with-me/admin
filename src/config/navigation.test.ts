import { describe, expect, it } from 'vitest'
import { NAV, PERMISSION_BY_ROUTE, PLACEHOLDERS, visibleNav } from './navigation'

const keysOf = (groups: ReturnType<typeof visibleNav>) => groups.flatMap(g => g.items.map(i => i.key))
const canOnly = (...allowed: string[]) => (permission?: string) => !permission || allowed.includes(permission)

describe('visibleNav', () => {
  it('shows everything to someone with every permission', () => {
    const all = NAV.flatMap(g => g.items).map(i => i.key)
    expect(keysOf(visibleNav(() => true))).toEqual(all)
  })
  it('hides an item whose permission is missing', () => {
    const keys = keysOf(visibleNav(canOnly('admin.dashboard.view', 'admin.users.view')))
    expect(keys).toContain('Users')
    expect(keys).not.toContain('Team')
    expect(keys).not.toContain('Audit')
  })
  it('drops groups that end up empty', () => {
    const groups = visibleNav(canOnly('admin.dashboard.view'))
    expect(groups.map(g => g.key)).toEqual(['main'])
  })
  it('shows nothing without permissions, except items that need none', () => {
    const keys = keysOf(visibleNav(canOnly()))
    const needNone = NAV.flatMap(g => g.items).filter(i => !i.permission).map(i => i.key)
    expect(keys).toEqual(needNone)
  })
  it('respects "soon": an item under construction still shows, with its placeholder text', () => {
    const groups = visibleNav(canOnly('admin.events.view'))
    const events = groups.flatMap(g => g.items).find(i => i.key === 'Events')
    expect(events?.soon).toBe(true)
    expect(events?.about).toBeTruthy()
  })
  it('does not mutate NAV', () => {
    const before = NAV.map(g => g.items.length)
    visibleNav(canOnly())
    expect(NAV.map(g => g.items.length)).toEqual(before)
  })
})

describe('navigation data', () => {
  const items = NAV.flatMap(g => g.items)
  it('has unique keys and paths', () => {
    expect(new Set(items.map(i => i.key)).size).toBe(items.length)
    expect(new Set(items.map(i => i.path)).size).toBe(items.length)
  })
  it('lists exactly the "soon" items as placeholders, each explaining itself', () => {
    expect(PLACEHOLDERS.map(i => i.key)).toEqual(items.filter(i => i.soon).map(i => i.key))
    for (const p of PLACEHOLDERS) expect(p.about, p.key).toBeTruthy()
  })
  it('maps every route to its permission', () => {
    expect(PERMISSION_BY_ROUTE.Users).toBe('admin.users.view')
    expect(Object.keys(PERMISSION_BY_ROUTE)).toHaveLength(items.length)
  })
})
