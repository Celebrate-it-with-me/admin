import { API } from '@/services/axios'
import type { EventDetail, EventFilters, EventListMeta, EventRow } from '../types'
import { buildListParams } from '../labels'

export async function fetchEvents(filters: EventFilters, page: number, perPage: number): Promise<{ data: EventRow[]; meta: EventListMeta }> {
  const res = await API.get('events', { params: buildListParams(filters, page, perPage) })
  return res.data
}

export async function fetchEvent(id: number | string): Promise<EventDetail> {
  const res = await API.get(`events/${id}`)
  return res.data.data
}
