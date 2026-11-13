/** A "nice" top for an axis and evenly spaced ticks from zero: 0, 5, 10, 15, 20 rather than 0, 4.3, 8.6... */
export function niceScale(max: number, ticks = 4): { top: number; values: number[] } {
  if (max <= 0) return { top: ticks, values: Array.from({ length: ticks + 1 }, (_, i) => i) }
  const rough = max / ticks
  const pow = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= rough) ?? 10 * pow
  const top = step * ticks
  return { top, values: Array.from({ length: ticks + 1 }, (_, i) => i * step) }
}

/** 12 nov */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-US', { day: 'numeric', month: 'short' }).replace('.', '')
}

/** Counts in full; money compact ($1.2K) once the axis gets there. */
export function compact(n: number): string {
  return new Intl.NumberFormat('es-US', { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n)
}
