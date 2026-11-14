import { describe, expect, it } from 'vitest'
import { mountUi } from '@/test/mount'
import StatusChip from './StatusChip.vue'

describe('StatusChip', () => {
  it.each([
    ['ok', 'Responde', 'text-success', 'mdi-check-circle-outline'],
    ['error', 'No responde', 'text-error', 'mdi-alert-circle-outline'],
    ['unknown', 'Sin datos', 'text-default', 'mdi-help-circle-outline'],
  ] as const)('renders %s', (status, text, colorClass, icon) => {
    const w = mountUi(StatusChip, { props: { status, text } })
    expect(w.text()).toBe(text)
    expect(w.classes()).toContain(colorClass)
    expect(w.find(`.${icon}`).exists()).toBe(true)
  })
})
