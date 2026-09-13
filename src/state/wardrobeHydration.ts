import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from "react"
import { findMatchingLook } from "../data/outfit"
import { formatErrorMessage } from "../lib/errorFormat"
import { fetchCloudLooks } from "./lookSync"
import type { Look, Persist } from "./persist"
import { fetchCloudWardrobeGarmentIds } from "./wardrobeItemSync"

export function useWardrobeHydration({
  userId,
  looksLoadedFor,
  stateRef,
  setState,
  setActiveLook,
  flash,
}: {
  userId: string | null
  looksLoadedFor: MutableRefObject<string | null>
  stateRef: MutableRefObject<Persist>
  setState: Dispatch<SetStateAction<Persist>>
  setActiveLook: Dispatch<SetStateAction<Look | null>>
  flash: (message?: string) => void
}) {
  useEffect(() => {
    if (!userId) return
    let active = true

    fetchCloudLooks(userId)
      .then((cloudLooks) => {
        if (!active) return
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
      .catch((err) => {
        if (!active) return
        console.error("Error loading looks:", err)
        flash(formatErrorMessage(err))
      })

    fetchCloudWardrobeGarmentIds(userId)
      .then((garmentIds) => {
        if (!active) return
        setState((prev) => {
          const next = {
            ...prev,
            owned: garmentIds,
          }
          stateRef.current = next
          return next
        })
      })
      .catch((err) => {
        if (!active) return
        console.error("Error loading wardrobe items:", err)
        flash(formatErrorMessage(err))
      })

    return () => {
      active = false
    }
  }, [flash, looksLoadedFor, setActiveLook, setState, stateRef, userId])
}

