/** Flatten profile + optional presence embed into ProfileRow. */
export function mapProfileRow(data: {
  id: string
  username: string
  minecraft_username: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  show_last_seen: boolean
  show_likes: boolean
  username_changed_at: string | null
  created_at: string
  updated_at: string
  profile_presence?:
    | { last_seen_at: string | null }
    | { last_seen_at: string | null }[]
    | null
}): import("./supabase").ProfileRow {
  const presence = Array.isArray(data.profile_presence)
    ? data.profile_presence[0]
    : data.profile_presence
  return {
    id: data.id,
    username: data.username,
    minecraft_username: data.minecraft_username,
    bio: data.bio,
    avatar_url: data.avatar_url,
    banner_url: data.banner_url,
    show_last_seen: data.show_last_seen,
    show_likes: data.show_likes,
    username_changed_at: data.username_changed_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_seen_at: presence?.last_seen_at ?? null,
  }
}

export const PROFILE_SELECT =
  "id, username, minecraft_username, bio, avatar_url, banner_url, show_last_seen, show_likes, username_changed_at, created_at, updated_at, profile_presence(last_seen_at)"
