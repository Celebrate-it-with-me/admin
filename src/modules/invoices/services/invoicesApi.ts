import { API } from '@/services/axios'
import type { InvoiceDetail, InvoiceFilters, InvoicePage } from '../types'
import { buildParams } from '../logic'

export const fetchInvoices = async (f: InvoiceFilters, page: number, perPage: number): Promise<InvoicePage> =>
  (await API.get('invoices', { params: buildParams(f, page, perPage) })).data

export const fetchInvoice = async (id: number): Promise<InvoiceDetail> => (await API.get(`invoices/${id}`)).data.data

export const resendInvoice = async (id: number, reason: string, email?: string): Promise<InvoiceDetail> =>
  (await API.post(`invoices/${id}/resend`, { reason, email: email || undefined })).data.data

/** The PDF needs the auth header, so it is fetched as a blob and saved from memory. */
export async function downloadPdf(kind: 'invoice' | 'credit-note', id: number, filename: string): Promise<void> {
  const path = kind === 'invoice' ? `invoices/${id}/pdf` : `invoices/credit-notes/${id}/pdf`
  const res = await API.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(res.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
