export function isEmailVerified(
  user: { email?: string | null; email_confirmed_at?: string | null } | null,
): boolean {
  if (!user) return false
  if (!user.email) return true
  return Boolean(user.email_confirmed_at)
}

export function isUnconfirmedAuthError(message: string): boolean {
  return /email not confirmed/i.test(message)
}
