import { API } from '@/services/axios'
import type { BulkAction, BulkResponse, ItemType, ModerationFilters, ModerationItem } from '../types'
import { buildParams } from '../logic'

export interface Page { data: ModerationItem[]; meta: { page: number; perPage: number; total: number; lastPage: number } }

export const fetchQueue = async (f: ModerationFilters, page: number, perPage: number): Promise<Page> =>
  (await API.get('moderation', { params: buildParams(f, page, perPage) })).data

export const hideItem = async (type: ItemType, id: number, reason: string) =>
  (await API.post(`moderation/${type}/${id}/hide`, { reason })).data.data as { changed: boolean; item: ModerationItem }

export const restoreItem = async (type: ItemType, id: number, reason?: string) =>
  (await API.post(`moderation/${type}/${id}/restore`, reason ? { reason } : {})).data.data as { changed: boolean; item: ModerationItem }

export const deleteItem = async (type: ItemType, id: number, reason: string) =>
  (await API.delete(`moderation/${type}/${id}`, { data: { reason } })).data.data

export const bulk = async (action: BulkAction, items: { type: ItemType; id: number }[], reason?: string) =>
  (await API.post('moderation/bulk', { action, items, reason })).data.data as BulkResponse
