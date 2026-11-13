// Shared types for the admin app.

/** Shape of the error body returned by the API (e.g. `{ data: { message } }`). */
export interface ApiErrorResponse {
  data: { message: string }
}

export interface PartyMember {
  name: string
  confirmed: number
}

export interface MainGuestItem {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  confirmed: string
  partyMembers: PartyMember[]
}

export interface UserItem {
  id?: number
  name: string
  email: string
}

export interface CurrentUser {
  name?: string
  email?: string
  permissions?: string[]
  [key: string]: unknown
}
