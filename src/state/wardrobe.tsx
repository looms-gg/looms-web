import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useAuthOptional } from "./auth"
import { freshPersist, type Look, type Persist } from "./persist"
import { useWardrobeHydration } from "./wardrobeHydration"
import { useWardrobeItems } from "./useWardrobeItems"
import { useWardrobeLooks } from "./useWardrobeLooks"
import { useWardrobeNotice } from "./wardrobeNotice"
import { useWardrobeOutfitActions } from "./useWardrobeOutfitActions"
import type {
  PatchFn,
  PatchResult,
  WardrobeContextValue,
  WardrobeMutationResult,
} from "./wardrobeTypes"

export type { Look, Persist, WardrobeMutationResult }

const WardrobeContext = createContext<WardrobeContextValue | null>(null)

export function WardrobeProvider({ children }: { children: ReactNode }) {
  const auth = useAuthOptional()
  const user = auth?.user ?? null
  const userId = user?.id ?? null
  const sessionOwner = userId ?? "signed-out"
  const [owner, setOwner] = useState<string | "signed-out" | "pending">("pending")
  const [state, setState] = useState<Persist>(freshPersist)
  const [activeLook, setActiveLook] = useState<Look | null>(null)
  const looksLoadedFor = useRef<string | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const { notice, flash, dismissNotice } = useWardrobeNotice()

  if (owner !== sessionOwner) {
    setOwner(sessionOwner)
    const reset = freshPersist()
    setState(reset)
    stateRef.current = reset
    setActiveLook(null)
    looksLoadedFor.current = null
  }

  useWardrobeHydration({
    userId,
    looksLoadedFor,
    stateRef,
    setState,
    setActiveLook,
    flash,
  })

  const patch: PatchFn = useCallback(
    (updater: (prev: Persist) => PatchResult, options?: { notify?: boolean }) => {
      // Apply outside setState: keeps the transition pure and runs effects after.
      const result = updater(stateRef.current)
      stateRef.current = result.next
      setState(result.next)
      if (result.activeLook) setActiveLook(result.activeLook)
      if (result.message && options?.notify !== false) flash(result.message)
      result.cloudOp?.()
    },
    [flash],
  )

  const { addToWardrobe, removeFromWardrobe, wear, addAndWear, owns } =
    useWardrobeItems({
      userId,
      state,
      patch,
      flash,
    })

  const { loadLook, saveLook, overwriteLook, updateLookMeta, renameLook } =
    useWardrobeLooks({
      user,
      stateRef,
      patch,
      flash,
      setActiveLook,
    })

  const {
    clearSlot,
    moveStack,
    setBody,
    setBodyHue,
    setModel,
    setPlayerName,
    clearPlayerName,
  } = useWardrobeOutfitActions(patch)

  const value = useMemo<WardrobeContextValue>(
    () => ({
      ...state,
      notice,
      activeLook,
      setActiveLook,
      addToWardrobe,
      removeFromWardrobe,
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
      dismissNotice,
    }),
    [
      state,
      notice,
      activeLook,
      addToWardrobe,
      removeFromWardrobe,
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
      flash,
      dismissNotice,
    ],
  )

  return <WardrobeContext value={value}>{children}</WardrobeContext>
}

export function useWardrobe() {
  const ctx = useContext(WardrobeContext)
  if (!ctx) throw new Error("useWardrobe must be used in WardrobeProvider")
  return ctx
}
