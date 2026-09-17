import { supabase } from "../supabase"

/**
 * Shape of a raw profiles row as it arrives from PostgREST. Every field except
 * id/username is optional so a pre-migration database (missing newer columns)
 * still maps cleanly instead of nuking the whole profile system.
 *
 * Transitional shim — remove when the following conditions hold (verify by
 * checking a live row through the Supabase CLI or a recent backup):
 * 1. production profiles rows carry show_likes / notify_* / username_changed_at /
 *    onboarding_complete (migrations up to 20260908050000 applied since
 *    2026-09-08), and
 * 2. the profile_presence table exists everywhere (20260908041000).
 * Then make every column required and drop the plain-select fallback below;
 * keep the presence-embed guard only if deploy ordering can still race.
 */
export type ProfileRowData = {
  id: string
  username: string
  minecraft_username?: string | null
  bio?: string | null
  avatar_url?: string | null
  banner_url?: string | null
  show_last_seen?: boolean
  show_likes?: boolean
  notify_likes?: boolean
  notify_comments?: boolean
  notify_replies?: boolean
  username_changed_at?: string | null
  onboarding_complete?: boolean
  created_at: string
  updated_at: string
  profile_presence?:
    | { last_seen_at: string | null }
    | { last_seen_at: string | null }[]
    | null
}

function resolveProfilePresence(presence: ProfileRowData["profile_presence"]): string | null {
  if (!presence) return null
  const item = Array.isArray(presence) ? presence[0] : presence
  return item?.last_seen_at ?? null
}

function resolveProfilePreferences(data: ProfileRowData) {
  return {
    show_last_seen: data.show_last_seen ?? true,
    show_likes: data.show_likes ?? true,
    notify_likes: data.notify_likes ?? true,
    notify_comments: data.notify_comments ?? true,
    notify_replies: data.notify_replies ?? true,
  }
}

function resolveProfileMetadata(data: ProfileRowData) {
  return {
    minecraft_username: data.minecraft_username ?? null,
    bio: data.bio ?? null,
    avatar_url: data.avatar_url ?? null,
    banner_url: data.banner_url ?? null,
    username_changed_at: data.username_changed_at ?? null,
    onboarding_complete: data.onboarding_complete ?? false,
  }
}

/** Flatten profile + optional presence embed into ProfileRow. */
export function mapProfileRow(data: ProfileRowData): import("../supabase").ProfileRow {
  return {
    id: data.id,
    username: data.username,
    ...resolveProfileMetadata(data),
    ...resolveProfilePreferences(data),
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_seen_at: resolveProfilePresence(data.profile_presence),
  }
}

/**
 * `*` picks up whichever columns exist, so a migration that has not been pushed
 * yet cannot break the projection. Only the presence embed can still fail (the
 * table itself may be missing), and fetchProfileRow falls back to a plain row
 * for that case.
 */
export const PROFILE_SELECT = "*, profile_presence(last_seen_at)"

export type ProfileFetchResult = {
  data: ProfileRowData | null
  error: { message: string } | null
}

/** Fetch one profile row by id or username, tolerating pre-migration schemas. */
export async function fetchProfileRow(
  column: "id" | "username",
  value: string,
): Promise<ProfileFetchResult> {
  const embedded = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq(column, value)
    .maybeSingle()

  if (!embedded.error) {
    return { data: (embedded.data as ProfileRowData) ?? null, error: null }
  }

  const plain = await supabase
    .from("profiles")
    .select("*")
    .eq(column, value)
    .maybeSingle()

  if (plain.error) return { data: null, error: plain.error }
  return { data: (plain.data as ProfileRowData) ?? null, error: null }
}
