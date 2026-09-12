import { sanitizeUsername } from "./sanitize"

export const OAUTH_PROVIDERS = ["discord", "google", "azure"] as const

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number]

export const OAUTH_RETURN_KEY = "looms_oauth_return_v1"

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value)
}

export function providerLabel(provider: OAuthProvider): string {
  if (provider === "discord") return "Discord"
  if (provider === "google") return "Google"
  return "Microsoft"
}

const USERNAME_METADATA_KEYS = [
  "global_name",
  "user_name",
  "name",
  "preferred_username",
  "full_name",
] as const

export function pickOAuthUsername(user: {
  app_metadata?: { provider?: string } | null
  user_metadata?: Record<string, unknown> | null
} | null): string {
  const meta = user?.user_metadata
  if (!meta) return ""
  for (const key of USERNAME_METADATA_KEYS) {
    const value = meta[key]
    if (typeof value === "string" && value.trim()) {
      const clean = sanitizeUsername(value)
      if (clean) return clean
    }
  }
  return ""
}

export function stashOAuthReturn(pathname: string, search: string): void {
  try {
    window.localStorage.setItem(OAUTH_RETURN_KEY, `${pathname}${search}`)
  } catch {
    // Storage can be unavailable (private mode); the callback falls back to "/".
  }
}

export function takeOAuthReturn(): string {
  try {
    const stored = window.localStorage.getItem(OAUTH_RETURN_KEY)
    window.localStorage.removeItem(OAUTH_RETURN_KEY)
    if (stored && stored.startsWith("/") && !stored.startsWith("//")) return stored
  } catch {
    // Fall through to the default.
  }
  return "/"
}
