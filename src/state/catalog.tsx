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

type GarmentWithMaker = GarmentRow & {
  profiles: { username: string } | { username: string }[] | null
}

type CatalogContextValue = {
  pieces: Piece[]
  loading: boolean
  error: string | null
  upsert: (piece: Piece) => void
  reload: () => Promise<void>
}

const CatalogContext = createContext<CatalogContextValue | null>(null)

function makerFromRow(row: GarmentWithMaker) {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
  return profile?.username?.trim() || "maker"
}

export async function loadGarments(userId?: string | null): Promise<Piece[]> {
  let query = supabase.from("garments").select("*, profiles!garments_user_id_fkey(username)")
  query = userId
    ? query.or(`is_public.eq.true,user_id.eq.${userId}`)
    : query.eq("is_public", true)

  const { data, error } = await query.order("added", { ascending: false })
  if (error) throw error

  return ((data ?? []) as GarmentWithMaker[]).map((row) =>
    garmentToPiece(row, makerFromRow(row)),
  )
}

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

  useEffect(() => {
    void reload()
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
