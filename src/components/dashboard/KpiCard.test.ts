import { describe, expect, it } from 'vitest'
import { mountUi } from '@/test/mount'
import KpiCard from './KpiCard.vue'

const mountKpi = (metric: { value: number; previous: number; change: number }, props: Record<string, unknown> = {}) =>
  mountUi(KpiCard, { props: { label: 'Ventas', metric, days: 30, ...props } })

describe('KpiCard', () => {
  it('shows the label and value', () => {
    const w = mountKpi({ value: 42, previous: 40, change: 2 })
    expect(w.text()).toContain('Ventas')
    expect(w.find('.kpi__value').text()).toBe('42')
  })

  it('formats numbers with the given function', () => {
    const w = mountKpi({ value: 9900, previous: 0, change: 9900 }, { format: (n: number) => `$${n / 100}` })
    expect(w.find('.kpi__value').text()).toBe('$99')
    expect(w.find('.kpi__delta').text()).toContain('+$99')
  })

  it('marks a rise as good and says so for screen readers', () => {
    const w = mountKpi({ value: 10, previous: 7, change: 3 })
    expect(w.find('.kpi__delta').classes()).toContain('kpi__delta--good')
    expect(w.find('.sr-only').text()).toBe('Subió 3 frente a los 30 días anteriores')
  })

  it('marks a fall as bad', () => {
    const w = mountKpi({ value: 7, previous: 10, change: -3 })
    expect(w.find('.kpi__delta').classes()).toContain('kpi__delta--bad')
    expect(w.find('.kpi__delta').text()).toContain('−3')
    expect(w.find('.sr-only').text()).toContain('Bajó 3')
  })

  it('flips the colours when more is worse (inverse)', () => {
    expect(mountKpi({ value: 5, previous: 2, change: 3 }, { inverse: true }).find('.kpi__delta').classes()).toContain('kpi__delta--bad')
    expect(mountKpi({ value: 2, previous: 5, change: -3 }, { inverse: true }).find('.kpi__delta').classes()).toContain('kpi__delta--good')
  })

  it('shows "sin cambio" and a neutral tone for no change', () => {
    const w = mountKpi({ value: 5, previous: 5, change: 0 })
    expect(w.find('.kpi__delta').classes()).toContain('kpi__delta--neutral')
    expect(w.find('.kpi__delta').text()).toContain('sin cambio')
    expect(w.find('.sr-only').text()).toBe('Igual que los 30 días anteriores')
  })
})
