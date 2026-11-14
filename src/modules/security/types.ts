export interface StaffMember {
  id: number
  name: string
  email: string
}

/** GET/PUT system/security. `notEnrolled` is capped by the API at 50 people; the counts are complete. */
export interface SecurityState {
  enabled: boolean
  enrolled: number
  total: number
  notEnrolled: StaffMember[]
  /** The environment variable already forces superadmins (the OR rule: it cannot be turned off from here). */
  envForced: boolean
}
