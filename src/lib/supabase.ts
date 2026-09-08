/** App-owned Supabase schema types. Do not parallel this with a generated Database file. */
import { createClient } from "@supabase/supabase-js"
import type { SkinModel } from "../skin/convert"
import type { LikeTargetType } from "./likeTarget"

export type { LikeTargetType } from "./likeTarget"

export type ProfileRow = {
  id: string
  username: string
  minecraft_username: string | null
  bio: string | null
  avatar_url: string | null
  banner_url: string | null
  last_seen_at: string | null
  show_last_seen: boolean
  show_likes: boolean
  username_changed_at: string | null
  created_at: string
  updated_at: string
}

export type LikeRow = {
  id: string
  user_id: string
  target_type: LikeTargetType
  target_id: string
  created_at: string
}

export type LookRow = {
  id: string
  user_id: string
  name: string
  description: string
  visibility: "private" | "public"
  stack: string[]
  body_id: string
  body_hue: number
  model: SkinModel
  created_at: string
  updated_at: string
}

export type GarmentRow = {
  id: string
  user_id: string
  name: string
  description: string | null
  slot: string
  body_group: string
  saved_count: number
  like_count: number
  added: number
  covers: string[]
  texture_url: string
  is_public: boolean
  tags: string[]
  created_at: string
}

export type WardrobeItemRow = {
  user_id: string
  garment_id: string
  created_at: string
}

export type GarmentCommentRow = {
  id: string
  garment_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Omit<ProfileRow, "last_seen_at">
        Insert: Partial<Omit<ProfileRow, "last_seen_at">> &
          Pick<ProfileRow, "id" | "username">
        Update: Partial<Omit<ProfileRow, "last_seen_at">>
        Relationships: []
      }
      profile_presence: {
        Row: {
          user_id: string
          last_seen_at: string | null
        }
        Insert: {
          user_id: string
          last_seen_at?: string | null
        }
        Update: {
          user_id?: string
          last_seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      looks: {
        Row: LookRow
        Insert: Omit<LookRow, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<LookRow>
        Relationships: []
      }
      garments: {
        Row: GarmentRow
        Insert: Omit<GarmentRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<GarmentRow>
        Relationships: [
          {
            foreignKeyName: "garments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wardrobe_items: {
        Row: WardrobeItemRow
        Insert: Omit<WardrobeItemRow, "created_at"> & {
          created_at?: string
        }
        Update: Partial<WardrobeItemRow>
        Relationships: [
          {
            foreignKeyName: "wardrobe_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wardrobe_items_garment_id_fkey"
            columns: ["garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_comments: {
        Row: GarmentCommentRow
        Insert: Omit<GarmentCommentRow, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<GarmentCommentRow>
        Relationships: [
          {
            foreignKeyName: "garment_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_comments_garment_id_fkey"
            columns: ["garment_id"]
            isOneToOne: false
            referencedRelation: "garments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garment_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "garment_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: LikeRow
        Insert: Omit<LikeRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<LikeRow>
        Relationships: [
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      touch_last_seen: {
        Args: Record<string, never>
        Returns: undefined
      }
    }
  }
}

function resolveSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    )
  }
  return { url, anonKey }
}

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabase() {
  if (!supabaseClient) {
    const { url, anonKey } = resolveSupabaseConfig()
    supabaseClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return supabaseClient
}

type Client = ReturnType<typeof createClient<Database>>

/**
 * Lazy facade: importing this module does not construct the client.
 * Own `from`/`auth`/`storage`/`rpc` so vitest can spyOn them.
 */
export const supabase = {
  get auth() {
    return getSupabase().auth
  },
  get storage() {
    return getSupabase().storage
  },
  from(...args: unknown[]) {
    return (getSupabase().from as (...a: unknown[]) => unknown)(...args)
  },
  rpc(...args: unknown[]) {
    return (getSupabase().rpc as (...a: unknown[]) => unknown)(...args)
  },
} as unknown as Client