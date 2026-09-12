import { supabase } from "./supabase"

/**
 * Shape of a raw profiles row as it arrives from PostgREST. Every field except
 * id/username is optional so a pre-migration database (missing newer columns)
 * still maps cleanly instead of nuking the whole profile system.
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

/** Flatten profile + optional presence embed into ProfileRow. */
export function mapProfileRow(data: ProfileRowData): import("./supabase").ProfileRow {
  const presence = Array.isArray(data.profile_presence)
    ? data.profile_presence[0]
    : data.profile_presence
  return {
    id: data.id,
    username: data.username,
    minecraft_username: data.minecraft_username ?? null,
    bio: data.bio ?? null,
    avatar_url: data.avatar_url ?? null,
    banner_url: data.banner_url ?? null,
    show_last_seen: data.show_last_seen ?? true,
    show_likes: data.show_likes ?? true,
    notify_likes: data.notify_likes ?? true,
    notify_comments: data.notify_comments ?? true,
    notify_replies: data.notify_replies ?? true,
    username_changed_at: data.username_changed_at ?? null,
    onboarding_complete: data.onboarding_complete ?? false,
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_seen_at: presence?.last_seen_at ?? null,
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
