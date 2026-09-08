import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { supabase } from "../lib/supabase"
import { useAuthOptional } from "./auth"
import { likeKey, type LikeTargetType } from "./likeKey"

export type { LikeTargetType } from "./likeKey"
export { likeKey, parseLikeKey } from "./likeKey"

interface LikesContextValue {
  likedKeys: ReadonlySet<string>
  loading: boolean
  isLiked: (type: LikeTargetType, id: string) => boolean
  toggleLike: (type: LikeTargetType, id: string) => Promise<{ error: Error | null }>
}

const LikesContext = createContext<LikesContextValue | null>(null)

export function LikesProvider({ children }: { children: ReactNode }) {
  const auth = useAuthOptional()
  const userId = auth?.user?.id ?? null
  const [likedKeys, setLikedKeys] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLikedKeys(new Set())
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void supabase
      .from("likes")
      .select("target_type, target_id")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error("Error loading likes:", error.message)
          setLikedKeys(new Set())
        } else {
          const next = new Set<string>()
          for (const row of data ?? []) {
            if (row.target_type === "garment" || row.target_type === "look") {
              next.add(likeKey(row.target_type, row.target_id))
            }
          }
          setLikedKeys(next)
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const isLiked = useCallback(
    (type: LikeTargetType, id: string) => likedKeys.has(likeKey(type, id)),
    [likedKeys],
  )

  const toggleLike = useCallback(
    async (type: LikeTargetType, id: string): Promise<{ error: Error | null }> => {
      if (!userId) return { error: new Error("Not authenticated") }

      const key = likeKey(type, id)
      const currentlyLiked = likedKeys.has(key)

      setLikedKeys((prev) => {
        const next = new Set(prev)
        if (currentlyLiked) next.delete(key)
        else next.add(key)
        return next
      })

      if (currentlyLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("user_id", userId)
          .eq("target_type", type)
          .eq("target_id", id)

        if (error) {
          setLikedKeys((prev) => new Set(prev).add(key))
          return { error: new Error(error.message) }
        }
        return { error: null }
      }

      const { error } = await supabase.from("likes").insert({
        user_id: userId,
        target_type: type,
        target_id: id,
      })

      if (error) {
        setLikedKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        return { error: new Error(error.message) }
      }
      return { error: null }
    },
    [likedKeys, userId],
  )

  const value = useMemo(
    () => ({ likedKeys, loading, isLiked, toggleLike }),
    [likedKeys, loading, isLiked, toggleLike],
  )

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>
}

export function useLikesOptional(): LikesContextValue | null {
  return useContext(LikesContext)
}

export function useLikes(): LikesContextValue {
  const ctx = useContext(LikesContext)
  if (!ctx) throw new Error("useLikes must be used within a LikesProvider")
  return ctx
}
