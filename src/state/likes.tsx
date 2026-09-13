import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { formatErrorMessage } from "../lib/errorFormat"
import { supabase } from "../lib/supabase"
import { useAuthOptional } from "./auth"
import { likeKey, type LikeTargetType } from "./likeKey"

export type { LikeTargetType } from "./likeKey"
export { likeKey, parseLikeKey } from "./likeKey"

type LikesContextValue = {
  likedKeys: ReadonlySet<string>
  loading: boolean
  loadError: string | null
  dismissLoadError: () => void
  isLiked: (type: LikeTargetType, id: string) => boolean
  toggleLike: (type: LikeTargetType, id: string) => Promise<{ error: Error | null }>
}

const LikesContext = createContext<LikesContextValue | null>(null)

export function LikesProvider({ children }: { children: ReactNode }) {
  const auth = useAuthOptional()
  const userId = auth?.user?.id ?? null
  const [likedKeys, setLikedKeys] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Mirror for reading the settled liked state inside async toggles; toggles
  // are serialized per key below, so this ref is authoritative at task start.
  const likedKeysRef = useRef(likedKeys)
  likedKeysRef.current = likedKeys
  const toggleChainsRef = useRef<Map<string, Promise<{ error: Error | null }>>>(new Map())

  useEffect(() => {
    if (!userId) {
      setLikedKeys(new Set())
      setLoading(false)
      setLoadError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    void supabase.from("likes")
      .select("target_type, target_id")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setLoadError(formatErrorMessage(error))
          setLikedKeys(new Set())
        } else {
          setLoadError(null)
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

  const dismissLoadError = useCallback(() => {
    setLoadError(null)
  }, [])

  const isLiked = useCallback(
    (type: LikeTargetType, id: string) => likedKeys.has(likeKey(type, id)),
    [likedKeys],
  )

  const toggleLike = useCallback(
    async (type: LikeTargetType, id: string): Promise<{ error: Error | null }> => {
      if (!userId) return { error: new Error("Not authenticated") }
      const key = likeKey(type, id)

      // Optimistic flip now, derived from the settled ref (not a stale render
      // snapshot) and mirrored into it so rapid re-clicks in one render
      // window alternate instead of re-reading the same base value.
      const currentlyLiked = likedKeysRef.current.has(key)
      likedKeysRef.current = currentlyLiked
        ? new Set([...likedKeysRef.current].filter((k) => k !== key))
        : new Set(likedKeysRef.current).add(key)
      setLikedKeys((prev) => {
        const next = new Set(prev)
        if (currentlyLiked) next.delete(key)
        else next.add(key)
        return next
      })

      const networkOp = (async (): Promise<{ error: Error | null }> => {
        if (currentlyLiked) {
          const { error } = await supabase
            .from("likes")
            .delete()
            .eq("user_id", userId)
            .eq("target_type", type)
            .eq("target_id", id)

          if (error) {
            likedKeysRef.current = new Set(likedKeysRef.current).add(key)
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
          likedKeysRef.current = new Set([...likedKeysRef.current].filter((k) => k !== key))
          setLikedKeys((prev) => {
            const next = new Set(prev)
            next.delete(key)
            return next
          })
          return { error: new Error(error.message) }
        }
        return { error: null }
      })()

      // One in-flight network op per key: a queued second click runs after
      // the first settles instead of racing it with a parallel write.
      const prior = toggleChainsRef.current.get(key) ?? Promise.resolve()
      const task = prior.then(() => networkOp)
      toggleChainsRef.current.set(key, task)
      void task.finally(() => {
        if (toggleChainsRef.current.get(key) === task) toggleChainsRef.current.delete(key)
      })
      return task
    },
    [userId],
  )

  const value = useMemo(
    () => ({ likedKeys, loading, loadError, dismissLoadError, isLiked, toggleLike }),
    [likedKeys, loading, loadError, dismissLoadError, isLiked, toggleLike],
  )

  return <LikesContext value={value}>{children}</LikesContext>
}

export function useLikes(): LikesContextValue {
  const ctx = useContext(LikesContext)
  if (!ctx) throw new Error("useLikes must be used within a LikesProvider")
  return ctx
}

export function useLikesOptional(): LikesContextValue | null {
  return useContext(LikesContext)
}
