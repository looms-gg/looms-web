import { sanitizeMinecraftUsername, sanitizeUrl } from "../lib/sanitize"

export const USERNAME_COOLDOWN_MS = 15 * 24 * 60 * 60 * 1000

const FIVE_MINUTES_MS = 5 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function resolveAvatarUrl(
  profile: {
    username?: string
    minecraft_username?: string | null
    avatar_url?: string | null
  } | null,
): string | null {
  if (!profile) return null

  if (profile.avatar_url && profile.avatar_url.trim()) {
    const safe = sanitizeUrl(profile.avatar_url)
    if (safe) return safe
  }

  if (profile.minecraft_username && profile.minecraft_username.trim()) {
    const safeMc = sanitizeMinecraftUsername(profile.minecraft_username)
    if (safeMc) {
      return `https://minotar.net/helm/${encodeURIComponent(safeMc)}/128.png`
    }
  }

  return null
}

export function initialsFromUsername(username: string): string {
  const chars = username.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  if (!chars) return "?"
  return chars.slice(0, 2)
}

export function canChangeUsername(
  usernameChangedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!usernameChangedAt) return true
  const changed = Date.parse(usernameChangedAt)
  if (Number.isNaN(changed)) return true
  return now - changed >= USERNAME_COOLDOWN_MS
}

export function nextUsernameChangeAt(
  usernameChangedAt: string | null | undefined,
): Date | null {
  if (!usernameChangedAt) return null
  const changed = Date.parse(usernameChangedAt)
  if (Number.isNaN(changed)) return null
  return new Date(changed + USERNAME_COOLDOWN_MS)
}

/**
 * Human-readable reason the username is locked, or null when it can change.
 */
export function usernameLockMessage(
  usernameChangedAt: string | null | undefined,
): string | null {
  if (canChangeUsername(usernameChangedAt)) return null
  const next = nextUsernameChangeAt(usernameChangedAt)
  return next
    ? `You can change your username again on ${next.toLocaleDateString()}.`
    : "Username can only be changed once every 15 days."
}

export function formatLastSeen(
  lastSeenAt: string | null | undefined,
  now: number = Date.now(),
): string | null {
  if (!lastSeenAt) return null
  const seen = Date.parse(lastSeenAt)
  if (Number.isNaN(seen)) return null

  const delta = Math.max(0, now - seen)

  if (delta < FIVE_MINUTES_MS) return "Active now"
  if (delta < ONE_HOUR_MS) {
    const mins = Math.max(1, Math.floor(delta / 60_000))
    return `${mins}m ago`
  }
  if (delta < ONE_DAY_MS) {
    const hours = Math.max(1, Math.floor(delta / ONE_HOUR_MS))
    return `${hours}h ago`
  }

  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  if (seen >= startOfYesterday.getTime() && seen < startOfToday.getTime()) {
    return "Yesterday"
  }

  const days = Math.max(1, Math.floor(delta / ONE_DAY_MS))
  if (days < 7) return `${days}d ago`

  return new Date(seen).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
