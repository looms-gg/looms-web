export type ProfileEmbed = {
  username: string
  avatar_url: string | null
}

/**
 * Coerce a PostgREST profile embed (a `profiles(...)` join) into a plain
 * maker identity. Depending on the select string and schema state the embed
 * arrives as an object, a single-element array, or nothing; this never
 * throws and falls back to the neutral "maker" name with no avatar.
 */
export function coerceProfileEmbed(value: unknown): ProfileEmbed {
  if (value == null) return { username: "maker", avatar_url: null }
  const profile = Array.isArray(value) ? value[0] : value
  if (profile && typeof profile === "object") {
    const { username, avatar_url } = profile as { username?: unknown; avatar_url?: unknown }
    return {
      username: typeof username === "string" && username.trim() ? username.trim() : "maker",
      avatar_url: typeof avatar_url === "string" ? avatar_url : null,
    }
  }
  return { username: "maker", avatar_url: null }
}
