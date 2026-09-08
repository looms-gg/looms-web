/**
 * Administration authorization configuration and utility helpers.
 */

export const ADMIN_USER_IDS: ReadonlySet<string> = new Set<string>([
  "45e6be54-c9a5-4627-af39-9c14b27ec92e",
])

/**
 * Checks whether a given user UUID has administrative privileges.
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false
  return ADMIN_USER_IDS.has(userId.trim().toLowerCase())
}
