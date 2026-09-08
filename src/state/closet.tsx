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
import { buyAndWearPiece, buyPiece, wearOwned } from "./closetShop"
import { bodyOrDefault } from "../data/bodies"
import { equippedFromStack, findMatchingLook, mergeStack, moveStackId } from "../data/outfit"
import { getPiece, type Slot } from "../data/catalog"
import type { SkinModel } from "../skin/convert"
import {
  clampHue,
  persistDefaults,
  type Look,
  type Persist,
} from "./persist"
import { AuthContext } from "./auth"
import { supabase } from "../lib/supabase"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { formatErrorMessage } from "../lib/errorFormat"
import {
  applyLookMeta,
  asLookDescription,
  asLookVisibility,
  type LookMetaPatch,
} from "./lookMeta"

export type { Look, Persist }

type ClosetContextValue = Persist & {
  notice: string | null
  activeLook: Look | null
  setActiveLook: (look: Look | null) => void
  addToWardrobe: (pieceId: string) => Promise<boolean>
  buy: (pieceId: string) => Promise<boolean>
  wear: (pieceId: string) => void
  addAndWear: (pieceId: string) => Promise<boolean>
  buyAndWear: (pieceId: string) => Promise<boolean>
  clearSlot: (slot: Slot) => void
  moveLayer: (pieceId: string, steps: number) => void
  setBody: (bodyId: string) => void
  setBodyHue: (hue: number) => void
  setModel: (model: SkinModel) => void
  loadLook: (look: Look) => void
  saveLook: (name: string) => void
  overwriteLook: (id: string, name: string) => void
  renameLook: (id: string, name: string) => void
  updateLookMeta: (id: string, patch: LookMetaPatch) => void
  setPlayerName: (name: string) => void
  clearPlayerName: () => void
  owns: (pieceId: string) => boolean
  notify: (message: string) => void
  dismissNotice: () => void
}

const ClosetContext = createContext<ClosetContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  const user = auth?.user ?? null
  const userId = user?.id ?? null
  const sessionOwner = userId ?? "signed-out"
  const [owner, setOwner] = useState<string | "signed-out" | "pending">("pending")
  const [state, setState] = useState<Persist>(persistDefaults)
  const [activeLook, setActiveLook] = useState<Look | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeTick, setNoticeTick] = useState(0)
  const looksLoadedFor = useRef<string | null>(null)

  if (owner !== sessionOwner) {
    setOwner(sessionOwner)
    setState(persistDefaults)
    setActiveLook(null)
    looksLoadedFor.current = null
  }

  useEffect(() => {
    if (!userId) return
    let active = true
    supabase
      .from("looks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active || error || !data) return
        const cloudLooks: Look[] = data.map((row) => ({
          id: row.id,
          name: row.name,
          stack: row.stack,
          equipped: equippedFromStack(row.stack ?? []),
          bodyId: row.body_id,
          bodyHue: row.body_hue,
          model: row.model,
          savedAt: new Date(row.created_at).getTime(),
          description: asLookDescription(row.description),
          visibility: asLookVisibility(row.visibility),
        }))
        // Only hydrate once per signed-in user so a late fetch cannot wipe
        // looks saved after mount but before this response landed.
        if (looksLoadedFor.current === userId) return
        looksLoadedFor.current = userId
        setState((prev) => {
          const cloudIds = new Set(cloudLooks.map((look) => look.id))
          const pendingLocal = prev.looks.filter((look) => !cloudIds.has(look.id))
          return { ...prev, looks: [...pendingLocal, ...cloudLooks] }
        })
        setActiveLook((curr) => {
          if (curr) {
            return cloudLooks.find((l) => l.id === curr.id) ?? curr
          }
          return (
            findMatchingLook(
              cloudLooks,
              state.equipped,
              state.bodyId,
              state.bodyHue,
              state.model,
            ) ?? null
          )
        })
      })

    void Promise.resolve(
      supabase
        .from("wardrobe_items")
        .select("garment_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .then(({ data, error }) => {
          if (!active) return
          if (error) {
            console.error("Error loading wardrobe items:", error)
            setNotice(formatErrorMessage(error))
            setNoticeTick((tick) => tick + 1)
            return
          }
          if (!data) return
          setState((prev) => ({
            ...prev,
            owned: data.map((row) => row.garment_id),
          }))
        }),
    ).catch(() => {})

    return () => {
      active = false
    }
  }, [userId])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(null), 2600)
    return () => window.clearTimeout(id)
  }, [notice, noticeTick])

  const flash = useCallback((message?: string) => {
    if (!message) return
    setNotice(message)
    setNoticeTick((tick) => tick + 1)
  }, [])

  const patch = useCallback(
    (updater: (prev: Persist) => { next: Persist; message?: string }) => {
      setState((prev) => {
        const { next, message } = updater(prev)
        if (message) queueMicrotask(() => flash(message))
        return next
      })
    },
    [flash],
  )

  const addToWardrobe = useCallback(
    async (pieceId: string): Promise<boolean> => {
      if (!userId) return false
      const piece = getPiece(pieceId)
      if (!piece || piece.slot === "eyes") return false

      const { error } = await supabase
        .from("wardrobe_items")
        .insert({ user_id: userId, garment_id: pieceId })

      if (error) {
        const code = (error as { code?: string }).code
        if (code === "23505") {
          patch((prev) => buyPiece(prev, pieceId))
          return false
        }
        flash(formatErrorMessage(error))
        return false
      }
      patch((prev) => buyPiece(prev, pieceId))
      return true
    },
    [flash, patch, userId],
  )

  const buy = addToWardrobe

  const wear = useCallback(
    (pieceId: string) => {
      patch((prev) => wearOwned(prev, pieceId))
    },
    [patch],
  )

  const addAndWear = useCallback(
    async (pieceId: string): Promise<boolean> => {
      const piece = getPiece(pieceId)
      if (!piece) return false
      if (piece.slot === "eyes") {
        patch((prev) => wearOwned(prev, pieceId))
        return false
      }
      if (!userId) return false
      if (state.owned.includes(pieceId)) {
        patch((prev) => wearOwned(prev, pieceId))
        return false
      }
      const { error } = await supabase
        .from("wardrobe_items")
        .insert({ user_id: userId, garment_id: pieceId })

      if (error) {
        const code = (error as { code?: string }).code
        if (code === "23505") {
          patch((prev) => buyAndWearPiece(prev, pieceId))
          return false
        }
        flash(formatErrorMessage(error))
        return false
      }
      patch((prev) => buyAndWearPiece(prev, pieceId))
      return true
    },
    [flash, patch, state.owned, userId],
  )

  const buyAndWear = addAndWear

  const clearSlot = useCallback(
    (slot: Slot) => {
      patch((prev) => {
        const equipped = { ...prev.equipped }
        delete equipped[slot]
        return { next: { ...prev, equipped, stack: mergeStack(prev.stack, equipped) } }
      })
    },
    [patch],
  )

  const moveLayer = useCallback(
    (pieceId: string, steps: number) => {
      patch((prev) => ({
        next: { ...prev, stack: moveStackId(prev.stack, pieceId, steps) },
      }))
    },
    [patch],
  )

  const setBody = useCallback(
    (bodyId: string) => {
      patch((prev) => {
        const id = bodyOrDefault(bodyId).id
        return {
          next: {
            ...prev,
            bodyId: id,
            bodyHue: id === prev.bodyId ? prev.bodyHue : 0,
          },
        }
      })
    },
    [patch],
  )

  const setBodyHue = useCallback(
    (hue: number) => {
      patch((prev) => ({ next: { ...prev, bodyHue: clampHue(hue) } }))
    },
    [patch],
  )

  const setModel = useCallback(
    (model: SkinModel) => {
      patch((prev) => ({ next: { ...prev, model } }))
    },
    [patch],
  )

  const loadLook = useCallback(
    (look: Look) => {
      setActiveLook(look)
      patch((prev) => ({
        next: {
          ...prev,
          activeLookId: look.id,
          equipped: look.equipped,
          stack: mergeStack(look.stack ?? [], look.equipped),
          bodyId: bodyOrDefault(look.bodyId).id,
          bodyHue: clampHue(look.bodyHue),
          model: look.model ?? prev.model,
        },
        message: `Loaded ${look.name}.`,
      }))
    },
    [patch],
  )

  const saveLook = useCallback(
    (name: string) => {
      if (!user) return
      const lookName = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      const lookId = crypto.randomUUID()
      patch((prev) => {
        const look: Look = {
          id: lookId,
          name: lookName,
          equipped: { ...prev.equipped },
          stack: [...prev.stack],
          bodyId: prev.bodyId,
          bodyHue: prev.bodyHue,
          model: prev.model,
          savedAt: Date.now(),
          description: "",
          visibility: "private",
        }
        setActiveLook(look)
        supabase
          .from("looks")
          .insert({
            id: lookId,
            user_id: user.id,
            name: lookName,
            description: "",
            visibility: "private",
            stack: prev.stack,
            body_id: prev.bodyId,
            body_hue: prev.bodyHue,
            model: prev.model,
          })
          .then(({ error }) => {
            if (error) {
              console.error("Error saving look to Supabase:", error)
              flash(formatErrorMessage(error))
            }
          })
        return {
          next: { ...prev, activeLookId: lookId, looks: [look, ...prev.looks] },
          message: `Saved ${look.name}.`,
        }
      })
    },
    [flash, patch, user],
  )

  const overwriteLook = useCallback(
    (id: string, name: string) => {
      if (!user) return
      const targetName = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      patch((prev) => {
        const nextLooks = prev.looks.map((l) =>
          l.id === id
            ? {
                ...l,
                name: targetName,
                equipped: { ...prev.equipped },
                stack: [...prev.stack],
                bodyId: prev.bodyId,
                bodyHue: prev.bodyHue,
                model: prev.model,
                savedAt: Date.now(),
              }
            : l,
        )
        const updated = nextLooks.find((l) => l.id === id)
        if (updated) {
          setActiveLook(updated)
        }
        supabase
          .from("looks")
          .update({
            name: targetName,
            stack: prev.stack,
            body_id: prev.bodyId,
            body_hue: prev.bodyHue,
            model: prev.model,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating look in Supabase:", error)
              flash(formatErrorMessage(error))
            }
          })
        return {
          next: { ...prev, activeLookId: id, looks: nextLooks },
          message: `Overwrote ${targetName}.`,
        }
      })
    },
    [flash, patch, user],
  )

  const updateLookMeta = useCallback(
    (id: string, meta: LookMetaPatch) => {
      if (!user) return
      patch((prev) => {
        const current = prev.looks.find((look) => look.id === id)
        if (!current) return { next: prev }
        const updated = applyLookMeta(current, meta)
        supabase
          .from("looks")
          .update({
            name: updated.name,
            description: updated.description,
            visibility: updated.visibility,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .then(({ error }) => {
            if (error) {
              console.error("Error updating look meta in Supabase:", error)
              flash(formatErrorMessage(error))
            }
          })
        return {
          next: {
            ...prev,
            looks: prev.looks.map((look) => (look.id === id ? updated : look)),
          },
        }
      })
    },
    [flash, patch, user],
  )

  const renameLook = useCallback(
    (id: string, name: string) => {
      updateLookMeta(id, { name })
    },
    [updateLookMeta],
  )

  const setPlayerName = useCallback(
    (name: string) => {
      const player = sanitizeText(name, MAX_LIMITS.USERNAME) || "player"
      patch((prev) => ({ next: { ...prev, player }, message: `Hey, ${player}.` }))
    },
    [patch],
  )

  const clearPlayerName = useCallback(() => {
    patch((prev) => ({ next: { ...prev, player: null } }))
  }, [patch])

  const owns = useCallback(
    (pieceId: string) => {
      const piece = getPiece(pieceId)
      if (piece?.slot === "eyes") return true
      if (piece?.userId && userId && piece.userId === userId) return true
      return state.owned.includes(pieceId)
    },
    [state.owned, userId],
  )

  const value = useMemo(
    () => ({
      ...state,
      notice,
      activeLook,
      setActiveLook,
      addToWardrobe,
      buy,
      wear,
      addAndWear,
      buyAndWear,
      clearSlot,
      moveLayer,
      setBody,
      setBodyHue,
      setModel,
      loadLook,
      saveLook,
      overwriteLook,
      renameLook,
      updateLookMeta,
      setPlayerName,
      clearPlayerName,
      owns,
      notify: flash,
      dismissNotice: () => setNotice(null),
    }),
    [
      activeLook,
      addAndWear,
      addToWardrobe,
      buy,
      buyAndWear,
      clearPlayerName,
      clearSlot,
      flash,
      loadLook,
      moveLayer,
      notice,
      overwriteLook,
      owns,
      renameLook,
      saveLook,
      updateLookMeta,
      setBody,
      setBodyHue,
      setModel,
      setPlayerName,
      state,
      wear,
    ],
  )

  return <ClosetContext value={value}>{children}</ClosetContext>
}

export function useSession() {
  const ctx = useContext(ClosetContext)
  if (!ctx) throw new Error("useSession must be used in SessionProvider")
  return ctx
}
