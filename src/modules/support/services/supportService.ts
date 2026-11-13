import { API } from '@/services/axios'
import type { StatusCounts, SupportDetail, SupportNote, SupportRow } from '../types'

export interface SupportList {
  data: SupportRow[]
  meta: { page: number; perPage: number; total: number; lastPage: number; counts: StatusCounts }
}

export const supportService = {
  list: async (params: Record<string, unknown>): Promise<SupportList> => (await API.get('support', { params })).data,
  show: async (id: number | string): Promise<SupportDetail> => (await API.get(`support/${id}`)).data.data,
  update: async (id: number, body: { status?: string; assignedTo?: number | null }): Promise<SupportDetail> =>
    (await API.patch(`support/${id}`, body)).data.data,
  addNote: async (id: number, body: string): Promise<SupportNote> => (await API.post(`support/${id}/notes`, { body })).data.data,
}
