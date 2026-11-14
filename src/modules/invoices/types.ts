export type InvoiceStatus = 'issued' | 'void'

export interface InvoiceRow {
  id: number
  number: string
  status: InvoiceStatus
  purchaseId: number
  event: { id: number; name: string } | null
  recipient: { name: string | null; email: string | null }
  totalCents: number
  currency: string
  locale: 'es' | 'en'
  issuedAt: string
  emailedAt: string | null
  creditNotesCount: number
}

export interface CreditNote {
  id: number
  number: string
  amountCents: number
  taxCents: number
  currency: string
  reason: string
  issuedAt: string
}

export interface InvoiceLine { description_key: string; event_name: string | null; quantity: number; unit_cents: number; total_cents: number }

export interface InvoiceDetail extends InvoiceRow {
  issuer: { name: string; address: string; tax_id: string; email: string | null }
  recipient: { name: string | null; email: string | null; address?: string | null; tax_id?: string | null }
  lines: InvoiceLine[]
  subtotalCents: number
  discountCents: number
  taxRate: number
  taxCents: number
  paymentMethod: string
  paymentReference: string | null
  voidedAt: string | null
  voidReason: string | null
  creditNotes: CreditNote[]
}

export interface InvoiceFilters { search: string; status: InvoiceStatus | null; from: string; to: string }

export interface InvoicePage { data: InvoiceRow[]; meta: { page: number; perPage: number; total: number; lastPage: number } }
