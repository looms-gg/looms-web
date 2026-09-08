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
import { addAndWearPiece, addPiece, setBodyPersist, wearOwned } from "./closetActions"
import { bodyOrDefault } from "../data/bodies"
import { findMatchingLook, mergeStack, moveStackId } from "../data/outfit"
import { getPiece, type Slot } from "../data/catalog"
import type { SkinModel } from "../skin/convert"
import {
  clampHue,
  freshPersist,
  type Look,
  type Persist,
} from "./persist"
import { AuthContext } from "./auth"
import { supabase } from "../lib/supabase"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import { formatErrorMessage } from "../lib/errorFormat"
import {
  applyLookMeta,
  lookPersistFields,
  lookRowToLook,
  type LookMetaPatch,
} from "./lookMeta"

export type { Look, Persist }

export type ClosetMutationResult = {
  error: Error | null
  inserted?: boolean
}

type ClosetContextValue = Persist & {
  notice: string | null
  activeLook: Look | null
  setActiveLook: (look: Look | null) => void
  addToWardrobe: (pieceId: string) => Promise<ClosetMutationResult>
  wear: (pieceId: string) => void
  addAndWear: (pieceId: string) => Promise<ClosetMutationResult>
  clearSlot: (slot: Slot) => void
  moveStack: (pieceId: string, steps: number) => void
  setBody: (bodyId: string) => void
  setBodyHue: (hue: number) => void
  setModel: (model: SkinModel) => void
  loadLook: (look: Look) => void
  saveLook: (name: string) => Promise<ClosetMutationResult>
  overwriteLook: (id: string, name: string) => Promise<ClosetMutationResult>
  renameLook: (id: string, name: string) => Promise<ClosetMutationResult>
  updateLookMeta: (id: string, patch: LookMetaPatch) => Promise<ClosetMutationResult>
  setPlayerName: (name: string) => void
  clearPlayerName: () => void
  owns: (pieceId: string) => boolean
  notify: (message: string) => void
  dismissNotice: () => void
}

const ClosetContext = createContext<ClosetContextValue | null>(null)

type PatchResult = {
  next: Persist
  message?: string
  activeLook?: Look
  cloudOp?: () => void
}

type WardrobeRowStatus = "ok" | "dup" | "fail"

export function ClosetProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext)
  const user = auth?.user ?? null
  const userId = user?.id ?? null
  const sessionOwner = userId ?? "signed-out"
  const [owner, setOwner] = useState<string | "signed-out" | "pending">("pending")
  const [state, setState] = useState<Persist>(freshPersist)
  const [activeLook, setActiveLook] = useState<Look | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [noticeTick, setNoticeTick] = useState(0)
  const looksLoadedFor = useRef<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  if (owner !== sessionOwner) {
    setOwner(sessionOwner)
    const reset = freshPersist()
    setState(reset)
    stateRef.current = reset
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
        if (!active) return
        if (error) {
          console.error("Error loading looks:", error)
          setNotice(formatErrorMessage(error))
          setNoticeTick((tick) => tick + 1)
          return
        }
        if (!data) return
        const cloudLooks: Look[] = data.map(lookRowToLook)
        // Only hydrate once per signed-in user so a late fetch cannot wipe
        // looks saved after mount but before this response landed.
        if (looksLoadedFor.current === userId) return
        looksLoadedFor.current = userId
        setState((prev) => {
          const cloudIds = new Set(cloudLooks.map((look) => look.id))
          const pendingLocal = prev.looks.filter((look) => !cloudIds.has(look.id))
          const next = { ...prev, looks: [...pendingLocal, ...cloudLooks] }
          stateRef.current = next
          return next
        })
        setActiveLook((curr) => {
          if (curr) {
            return cloudLooks.find((l) => l.id === curr.id) ?? curr
          }
          const live = stateRef.current
          return (
            findMatchingLook(
              cloudLooks,
              live.equipped,
              live.bodyId,
              live.bodyHue,
              live.model,
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
          setState((prev) => {
            const next = {
              ...prev,
              owned: data.map((row) => row.garment_id),
            }
            stateRef.current = next
            return next
          })
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

  const runLookWrite = useCallback(
    async (
      promise: PromiseLike<{ error: { message: string } | null }>,
    ): Promise<ClosetMutationResult> => {
      const { error } = await promise
      if (error) {
        flash(formatErrorMessage(error))
        return { error: new Error(error.message) }
      }
      return { error: null }
    },
    [flash],
  )

  const ensureWardrobeRow = useCallback(
    async (pieceId: string): Promise<WardrobeRowStatus> => {
      if (!userId) return "fail"
      const { error } = await supabase
        .from("wardrobe_items")
        .insert({ user_id: userId, garment_id: pieceId })
      if (!error) return "ok"
      const code = (error as { code?: string }).code
      if (code === "23505") return "dup"
      flash(formatErrorMessage(error))
      return "fail"
    },
    [flash, userId],
  )

  const patch = useCallback(
    (updater: (prev: Persist) => PatchResult) => {
      // Apply outside setState: keeps the transition pure and runs effects after.
      const result = updater(stateRef.current)
      stateRef.current = result.next
      setState(result.next)
      if (result.activeLook) setActiveLook(result.activeLook)
      if (result.message) flash(result.message)
      result.cloudOp?.()
    },
    [flash],
  )

  const addToWardrobe = useCallback(
    async (pieceId: string): Promise<ClosetMutationResult> => {
      if (!userId) return { error: new Error("Not authenticated"), inserted: false }
      const piece = getPiece(pieceId)
      if (!piece || piece.slot === "eyes") return { error: null, inserted: false }

      const status = await ensureWardrobeRow(pieceId)
      if (status === "fail") {
        return { error: new Error("Failed to add to wardrobe"), inserted: false }
      }
      patch((prev) => addPiece(prev, pieceId))
      return { error: null, inserted: status === "ok" }
    },
    [ensureWardrobeRow, patch, userId],
  )

  const wear = useCallback(
    (pieceId: string) => {
      patch((prev) => wearOwned(prev, pieceId))
    },
    [patch],
  )

  const addAndWear = useCallback(
    async (pieceId: string): Promise<ClosetMutationResult> => {
      const piece = getPiece(pieceId)
      if (!piece) return { error: null, inserted: false }
      if (piece.slot === "eyes") {
        patch((prev) => wearOwned(prev, pieceId))
        return { error: null, inserted: false }
      }
      if (!userId) return { error: new Error("Not authenticated"), inserted: false }
      if (state.owned.includes(pieceId)) {
        patch((prev) => wearOwned(prev, pieceId))
        return { error: null, inserted: false }
      }
      const status = await ensureWardrobeRow(pieceId)
      if (status === "fail") {
        return { error: new Error("Failed to add to wardrobe"), inserted: false }
      }
      patch((prev) => addAndWearPiece(prev, pieceId))
      return { error: null, inserted: status === "ok" }
    },
    [ensureWardrobeRow, patch, state.owned, userId],
  )

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

  const moveStack = useCallback(
    (pieceId: string, steps: number) => {
      patch((prev) => ({
        next: { ...prev, stack: moveStackId(prev.stack, pieceId, steps) },
      }))
    },
    [patch],
  )

  const setBody = useCallback(
    (bodyId: string) => {
      patch((prev) => setBodyPersist(prev, bodyId))
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
          stack: mergeStack(look.stack, look.equipped),
          bodyId: bodyOrDefault(look.bodyId).id,
          bodyHue: clampHue(look.bodyHue),
          model: look.model,
        },
        message: `Loaded ${look.name}.`,
      }))
    },
    [patch],
  )

  const saveLook = useCallback(
    async (name: string): Promise<ClosetMutationResult> => {
      if (!user) return { error: new Error("Not authenticated") }
      const lookName = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      const lookId = crypto.randomUUID()
      const ownerId = user.id
      let look: Look | null = null
      patch((prev) => {
        look = {
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
        return {
          next: { ...prev, activeLookId: lookId, looks: [look, ...prev.looks] },
          message: `Saved ${look.name}.`,
          activeLook: look,
        }
      })
      if (!look) return { error: new Error("Failed to save look") }
      return runLookWrite(
        supabase.from("looks").insert({
          id: lookId,
          user_id: ownerId,
          ...lookPersistFields(look),
        }),
      )
    },
    [patch, runLookWrite, user],
  )

  const overwriteLook = useCallback(
    async (id: string, name: string): Promise<ClosetMutationResult> => {
      if (!user) return { error: new Error("Not authenticated") }
      const targetName = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      const ownerId = user.id
      let updated: Look | undefined
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
        updated = nextLooks.find((l) => l.id === id)
        if (!updated) {
          return { next: { ...prev, activeLookId: id, looks: nextLooks } }
        }
        return {
          next: { ...prev, activeLookId: id, looks: nextLooks },
          message: `Overwrote ${targetName}.`,
          activeLook: updated,
        }
      })
      if (!updated) return { error: null }
      return runLookWrite(
        supabase
          .from("looks")
          .update({
            ...lookPersistFields(updated),
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", ownerId),
      )
    },
    [patch, runLookWrite, user],
  )

  const updateLookMeta = useCallback(
    async (id: string, meta: LookMetaPatch): Promise<ClosetMutationResult> => {
      if (!user) return { error: new Error("Not authenticated") }
      const ownerId = user.id
      let updated: Look | undefined
      patch((prev) => {
        const current = prev.looks.find((look) => look.id === id)
        if (!current) return { next: prev }
        updated = applyLookMeta(current, meta)
        return {
          next: {
            ...prev,
            looks: prev.looks.map((look) => (look.id === id ? updated! : look)),
          },
        }
      })
      if (!updated) return { error: null }
      return runLookWrite(
        supabase
          .from("looks")
          .update({
            name: updated.name,
            description: updated.description,
            visibility: updated.visibility,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", ownerId),
      )
    },
    [patch, runLookWrite, user],
  )

  const renameLook = useCallback(
    (id: string, name: string) => updateLookMeta(id, { name }),
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
      wear,
      addAndWear,
      clearSlot,
      moveStack,
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
      clearPlayerName,
      clearSlot,
      flash,
      loadLook,
      moveStack,
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

export function useCloset() {
  const ctx = useContext(ClosetContext)
  if (!ctx) throw new Error("useCloset must be used in ClosetProvider")
  return ctx
}
