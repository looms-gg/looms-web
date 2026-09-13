import { useCallback } from "react"
import type { Slot } from "../data/catalog"
import { mergeStack, moveStackId } from "../data/outfit"
import { MAX_LIMITS, sanitizeText } from "../lib/sanitize"
import type { SkinModel } from "../skin/convert"
import { clampHue } from "../skin/hue"
import { setBodyPersist } from "./wardrobeActions"
import type { PatchFn } from "./wardrobeTypes"

export function useWardrobeOutfitActions(patch: PatchFn) {
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

  return {
    clearSlot,
    moveStack,
    setBody,
    setBodyHue,
    setModel,
    setPlayerName,
    clearPlayerName,
  }
}

