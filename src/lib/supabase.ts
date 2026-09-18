/** App-owned Supabase schema types. Do not parallel this with a generated Database file. */
import { createClient } from "@supabase/supabase-js"
import type { GarmentRow } from "../data/garment"
import type { SkinModel } from "../data/model"
import type { LikeTargetType } from "../data/likeTarget"
import type { LookVisibility } from "../data/look"
import type { OAuthProvider } from "./auth/oauth"

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
  notify_likes: boolean
  notify_comments: boolean
  notify_replies: boolean
  username_changed_at: string | null
  onboarding_complete: boolean
  created_at: string
  updated_at: string
}

export type ConnectionProvider = OAuthProvider

export type ConnectionRow = {
  user_id: string
  provider: ConnectionProvider
  featured: boolean
  created_at: string
}

export type LikeRow = {
  id: string
  user_id: string
  target_type: LikeTargetType
  target_id: string
  created_at: string
}

export type NotificationType = "like" | "comment" | "reply"
export type NotificationTargetType = LikeTargetType

export type NotificationRow = {
  id: string
  user_id: string
  actor_id: string
  type: NotificationType
  target_type: NotificationTargetType
  target_id: string
  read: boolean
  created_at: string
}

export type LookRow = {
  id: string
  user_id: string
  name: string
  description: string
  visibility: LookVisibility
  stack: string[]
  body_id: string
  body_hue: number
  model: SkinModel
  like_count?: number
  thumb_url?: string | null
  created_at: string
  updated_at: string
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

export type LookCommentRow = {
  id: string
  look_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  updated_at: string
}

export type ReportTargetType = "look" | "piece" | "comment" | "profile"
export type ReportStatus = "pending" | "resolved" | "dismissed"

export type ContentReportRow = {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  target_id: string
  target_sub_type: string | null
  target_label: string | null
  reason: string
  details: string | null
  status: ReportStatus
  action_taken: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
}

export type BannerStyle = "info" | "accent" | "warning" | "neutral"

export type SiteBannerRow = {
  id: string
  is_active: boolean
  text: string
  link_url: string | null
  link_label: string | null
  style: BannerStyle
  dismissible: boolean
  created_at: string
  updated_at: string
  updated_by: string | null
}

export type AdminUserRow = {
  user_id: string
  created_at: string
}

export type AdminAuditLogRow = {
  id: string
  admin_id: string
  action: string
  target_table: string
  target_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export type BlogPostRow = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  thumbnail_url: string | null
  category: string
  is_published: boolean
  published_at: string | null
  author_id: string
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
      profile_connections: {
        Row: ConnectionRow
        Insert: ConnectionRow
        Update: Partial<ConnectionRow>
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
      look_comments: {
        Row: LookCommentRow
        Insert: Omit<LookCommentRow, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<LookCommentRow>
        Relationships: [
          {
            foreignKeyName: "look_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_comments_look_id_fkey"
            columns: ["look_id"]
            isOneToOne: false
            referencedRelation: "looks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "look_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "look_comments"
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
      notifications: {
        Row: NotificationRow
        Insert: NotificationRow
        Update: Partial<NotificationRow>
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: ContentReportRow
        Insert: Omit<ContentReportRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<ContentReportRow>
        Relationships: []
      }
      site_banners: {
        Row: SiteBannerRow
        Insert: Omit<SiteBannerRow, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<SiteBannerRow>
        Relationships: []
      }
      admin_users: {
        Row: AdminUserRow
        Insert: AdminUserRow
        Update: Partial<AdminUserRow>
        Relationships: []
      }
      admin_audit_log: {
        Row: AdminAuditLogRow
        Insert: Omit<AdminAuditLogRow, "id" | "created_at"> & {
          id?: string
          created_at?: string
        }
        Update: Partial<AdminAuditLogRow>
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: BlogPostRow
        Insert: Omit<BlogPostRow, "id" | "created_at" | "updated_at"> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<BlogPostRow>
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
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
      get_trending_looks_past_day: {
        Args: { p_limit?: number }
        Returns: Array<
          LookRow & {
            recent_like_count: number
            username: string
            avatar_url: string | null
          }
        >
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_target_table: string
          p_target_id?: string | null
          p_details?: Record<string, unknown> | null
        }
        Returns: undefined
      }
      delete_my_account: {
        Args: Record<string, never>
        Returns: undefined
      }
      complete_onboarding: {
        Args: { p_username: string }
        Returns: undefined
      }
      unlink_connection: {
        Args: { p_provider: string }
        Returns: undefined
      }
      set_connection_featured: {
        Args: { p_provider: string; p_featured: boolean }
        Returns: undefined
      }
      get_yesterday_top_look: {
        Args: Record<string, never>
        Returns: Array<
          LookRow & {
            recent_like_count: number
            username: string
            avatar_url: string | null
          }
        >
      }
      admin_set_moderation_state: {
        Args: {
          p_target_type: string
          p_target_id: string
          p_state: string
          p_details?: Record<string, unknown> | null
        }
        Returns: undefined
      }
      admin_delete_content: {
        Args: { p_target_type: string; p_target_id: string; p_sub_type?: string | null }
        Returns: undefined
      }
      admin_resolve_report: {
        Args: { p_report_id: string; p_status: string; p_action_taken?: string | null }
        Returns: ContentReportRow
      }
      admin_save_banner: {
        Args: {
          p_id?: string | null
          p_is_active: boolean
          p_text: string
          p_link_url?: string | null
          p_link_label?: string | null
          p_style?: string
          p_dismissible?: boolean
        }
        Returns: SiteBannerRow
      }
      admin_save_blog_post: {
        Args: {
          p_title: string
          p_slug: string
          p_excerpt: string
          p_content: string
          p_id?: string | null
          p_thumbnail_url?: string | null
          p_category?: string
          p_is_published?: boolean
        }
        Returns: BlogPostRow
      }
      admin_delete_blog_post: {
        Args: {
          p_id: string
        }
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
        // PKCE: OAuth/email callbacks carry an opaque ?code= the browser
        // exchanges locally, so access tokens never appear in the URL.
        flowType: "pkce",
      },
    })
  }
  return supabaseClient
}

export type Client = ReturnType<typeof createClient<Database>>

export type SupabaseFacade = {
  readonly auth: Client["auth"]
  readonly storage: Client["storage"]
  from: Client["from"]
  rpc: Client["rpc"]
  channel: Client["channel"]
  removeChannel: Client["removeChannel"]
}

/**
 * Lazy facade: importing this module does not construct the client.
 * Own `from`/`auth`/`storage`/`rpc` so vitest can spyOn them.
 */
export const supabase: SupabaseFacade = {
  get auth(): Client["auth"] {
    return getSupabase().auth
  },
  get storage(): Client["storage"] {
    return getSupabase().storage
  },
  from: ((...args: Parameters<Client["from"]>) =>
    (getSupabase().from as (...a: unknown[]) => ReturnType<Client["from"]>)(...args)) as Client["from"],
  rpc: ((...args: Parameters<Client["rpc"]>) =>
    (getSupabase().rpc as (...a: unknown[]) => ReturnType<Client["rpc"]>)(...args)) as Client["rpc"],
  channel: ((...args: Parameters<Client["channel"]>) =>
    getSupabase().channel(...args)) as Client["channel"],
  removeChannel: ((...args: Parameters<Client["removeChannel"]>) =>
    getSupabase().removeChannel(...args)) as Client["removeChannel"],
}