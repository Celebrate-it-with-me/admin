/** Cents to a price: $99, or $79.50 when there are cents. */
export function formatMoney(cents: number, currency = 'USD'): string {
  const amount = (Number(cents) || 0) / 100
  return new Intl.NumberFormat('es-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}
