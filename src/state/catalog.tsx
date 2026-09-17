import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  pieces as registryPieces,
  replaceCatalog,
  subscribeToCatalog,
  upsertPiece,
  type Piece,
} from "../data/catalog"
import { garmentToPiece, type GarmentRow } from "../data/garment"
import { supabase } from "../lib/supabase"
import { useAuthOptional } from "./auth"
import { formatErrorMessage } from "../lib/errorFormat"
import { coerceProfileEmbed } from "../lib/content/profileEmbed"

type GarmentEmbedRow = GarmentRow & {
  profiles: unknown
}

type CatalogContextValue = {
  pieces: Piece[]
  loading: boolean
  error: string | null
  upsert: (piece: Piece) => void
  reload: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

export function mapGarmentEmbed(row: GarmentEmbedRow): Piece {
  return garmentToPiece(row, coerceProfileEmbed(row.profiles).username)
}

export async function fetchGarments(userId?: string | null): Promise<Piece[]> {
  let query = supabase.from("garments").select("*, profiles!garments_user_id_fkey(username)")
  query = userId
    ? query.or(`is_public.eq.true,user_id.eq.${userId}`)
    : query.eq("is_public", true)

  const { data, error } = await query.order("added", { ascending: false })
  if (error) throw error

  return (data ?? []).map((row) =>
    mapGarmentEmbed(row as GarmentEmbedRow),
  )
}

const RELOAD_BACKOFF_MS = [0, 1500, 4000] as const

export function CatalogProvider({ children }: { children: ReactNode }) {
  const auth = useAuthOptional()
  const userId = auth?.user?.id ?? null
  const [pieces, setPieces] = useState<Piece[]>(registryPieces)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const apply = useCallback((next: Piece[]) => {
    replaceCatalog(next)
  }, [])

  // The registry is the single source of truth; this state mirror only exists
  // to trigger React re-renders when the registry changes.
  useEffect(
    () => subscribeToCatalog(() => setPieces(registryPieces)),
    [],
  )

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const next = await fetchGarments(userId)
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
    upsertPiece(piece)
  }, [])

  const value = useMemo(
    () => ({ pieces, loading, error, upsert, reload }),
    [error, loading, pieces, reload, upsert],
  )

  return <CatalogContext value={value}>{children}</CatalogContext>
}

// Hook family convention for state contexts: every provider exposes useX
// (throws outside the provider) followed by useXOptional (returns null) only
// when some consumer can genuinely render outside the provider. theme,
// wardrobe, and cookieConsent deliberately omit Optional variants — their
// consumers are always mounted inside the provider tree.
export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error("useCatalog must be used in CatalogProvider")
  return ctx
}

// Tolerant variant for components that may render outside the provider
// (e.g. tests, or decorative previews): null instead of throwing.
export function useCatalogOptional(): CatalogContextValue | null {
  return useContext(CatalogContext)
}
