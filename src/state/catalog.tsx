import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { pieces as registryPieces, replaceCatalog, upsertPiece, type Piece } from "../data/catalog"
import { garmentToPiece } from "../data/garment"
import { supabase, type GarmentRow } from "../lib/supabase"
import { AuthContext } from "./auth"
import { formatErrorMessage } from "../lib/errorFormat"

type MakerProfileEmbed = { username: string } | { username: string }[] | null

type GarmentEmbedRow = GarmentRow & {
  profiles: MakerProfileEmbed
}

type CatalogContextValue = {
  pieces: Piece[]
  loading: boolean
  error: string | null
  upsert: (piece: Piece) => void
  reload: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

function asMakerProfileEmbed(value: unknown): MakerProfileEmbed {
  if (value == null) return null
  if (Array.isArray(value)) {
    return value
      .filter((item): item is { username: string } =>
        Boolean(item) && typeof item === "object" && typeof (item as { username?: unknown }).username === "string",
      )
      .map((item) => ({ username: item.username }))
  }
  if (typeof value === "object" && typeof (value as { username?: unknown }).username === "string") {
    return { username: (value as { username: string }).username }
  }
  return null
}

function makerFromEmbed(profiles: MakerProfileEmbed) {
  const profile = Array.isArray(profiles) ? profiles[0] : profiles
  return profile?.username?.trim() || "maker"
}

export function mapGarmentEmbed(row: GarmentEmbedRow): Piece {
  return garmentToPiece(row, makerFromEmbed(row.profiles))
}

export async function loadGarments(userId?: string | null): Promise<Piece[]> {
  let query = supabase.from("garments").select("*, profiles!garments_user_id_fkey(username)")
  query = userId
    ? query.or(`is_public.eq.true,user_id.eq.${userId}`)
    : query.eq("is_public", true)

  const { data, error } = await query.order("added", { ascending: false })
  if (error) throw error

  return (data ?? []).map((row) =>
    mapGarmentEmbed({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      slot: row.slot,
      body_group: row.body_group,
      saved_count: row.saved_count,
      like_count: row.like_count,
      added: row.added,
      covers: row.covers,
      texture_url: row.texture_url,
      is_public: row.is_public,
      tags: row.tags,
      created_at: row.created_at,
      profiles: asMakerProfileEmbed(row.profiles),
    }),
  )
}

const RELOAD_BACKOFF_MS = [0, 1500, 4000] as const

export function CatalogProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  const userId = auth?.user?.id ?? null
  const [pieces, setPieces] = useState<Piece[]>(registryPieces)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((next: Piece[]) => {
    replaceCatalog(next)
    setPieces(next)
  }, [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const next = await loadGarments(userId)
      apply(next)
      setError(null)
    } catch (err) {
      setError(formatErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [apply, userId])

  // Bounded retry with backoff: a single failed fetch must not leave the
  // registry empty (looks render naked) until the user manually refreshes.
  useEffect(() => {
    let active = true
    let timer: number | null = null
    const run = async (attempt: number) => {
      if (!active) return
      await reload()
      if (!active) return
      // Read the module registry (kept current by apply) instead of state from
      // this closure, so a successful load never re-arms the retry loop.
      if (registryPieces.length > 0) return
      const delay = RELOAD_BACKOFF_MS[attempt + 1]
      if (delay === undefined) return
      timer = window.setTimeout(() => void run(attempt + 1), delay)
    }
    void run(0)
    return () => {
      active = false
      if (timer != null) window.clearTimeout(timer)
    }
  }, [reload])

  const upsert = useCallback((piece: Piece) => {
    setPieces(upsertPiece(piece))
  }, [])

  const value = useMemo(
    () => ({ pieces, loading, error, upsert, reload }),
    [error, loading, pieces, reload, upsert],
  )

  return <CatalogContext value={value}>{children}</CatalogContext>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error("useCatalog must be used in CatalogProvider")
  return ctx
}

// Tolerant variant for components that may render outside the provider
// (e.g. tests, or decorative previews): null instead of throwing.
export function useCatalogOptional() {
  return useContext(CatalogContext)
}
