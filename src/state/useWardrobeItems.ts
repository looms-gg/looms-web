import { useCallback } from "react"
import { getPiece } from "../data/catalog"
import { formatErrorMessage } from "../lib/errorFormat"
import { addAndWearPiece, addPiece, removePiece, wearOwned } from "./wardrobeActions"
import {
  deleteCloudWardrobeItem,
  insertCloudWardrobeItem,
  type WardrobeRowStatus,
} from "./wardrobeItemSync"
import type { PatchFn, WardrobeMutationResult } from "./wardrobeTypes"
import type { Persist } from "./persist"

export function useWardrobeItems({
  userId,
  state,
  patch,
  flash,
}: {
  userId: string | null
  state: Persist
  patch: PatchFn
  flash: (message?: string) => void
}) {
  const ensureWardrobeRow = useCallback(
    async (pieceId: string): Promise<WardrobeRowStatus> => {
      if (!userId) return "fail"
      const { status, errorMessage } = await insertCloudWardrobeItem(userId, pieceId)
      if (status === "fail" && errorMessage) {
        flash(errorMessage)
      }
      return status
    },
    [flash, userId],
  )

  const addToWardrobe = useCallback(
    async (
      pieceId: string,
      options?: { notify?: boolean },
    ): Promise<WardrobeMutationResult> => {
      if (!userId) return { error: new Error("Not authenticated"), inserted: false }
      const piece = getPiece(pieceId)
      if (!piece || piece.slot === "eyes") return { error: null, inserted: false }

      const status = await ensureWardrobeRow(pieceId)
      if (status === "fail") {
        return { error: new Error("Failed to add to wardrobe"), inserted: false }
      }
      patch((prev) => addPiece(prev, pieceId), options)
      return { error: null, inserted: status === "ok" }
    },
    [ensureWardrobeRow, patch, userId],
  )

  const wear = useCallback(
    (pieceId: string, options?: { notify?: boolean }) => {
      patch((prev) => wearOwned(prev, pieceId), options)
    },
    [patch],
  )

  const removeFromWardrobe = useCallback(
    async (pieceId: string): Promise<WardrobeMutationResult> => {
      const piece = getPiece(pieceId)
      if (!piece || piece.slot === "eyes") return { error: null }
      if (!state.owned.includes(pieceId)) return { error: null }
      // Optimistic: drop the piece (and unequip it) right away, then sync.
      patch((prev) => removePiece(prev, pieceId))
      if (!userId) return { error: null }
      const { error } = await deleteCloudWardrobeItem(userId, pieceId)
      if (error) {
        flash(formatErrorMessage(error))
        return { error }
      }
      return { error: null }
    },
    [flash, patch, state.owned, userId],
  )

  const addAndWear = useCallback(
    async (
      pieceId: string,
      options?: { notify?: boolean },
    ): Promise<WardrobeMutationResult> => {
      const piece = getPiece(pieceId)
      if (!piece) return { error: null, inserted: false }
      if (piece.slot === "eyes") {
        patch((prev) => wearOwned(prev, pieceId), options)
        return { error: null, inserted: false }
      }
      if (!userId) return { error: new Error("Not authenticated"), inserted: false }
      if (state.owned.includes(pieceId)) {
        patch((prev) => wearOwned(prev, pieceId), options)
        return { error: null, inserted: false }
      }
      const status = await ensureWardrobeRow(pieceId)
      if (status === "fail") {
        return { error: new Error("Failed to add to wardrobe"), inserted: false }
      }
      patch((prev) => addAndWearPiece(prev, pieceId), options)
      return { error: null, inserted: status === "ok" }
    },
    [ensureWardrobeRow, patch, state.owned, userId],
  )

  const owns = useCallback(
    (pieceId: string) => {
      const piece = getPiece(pieceId)
      if (piece?.slot === "eyes") return true
      if (piece?.userId && userId && piece.userId === userId) return true
      return state.owned.includes(pieceId)
    },
    [state.owned, userId],
  )

  return {
    addToWardrobe,
    removeFromWardrobe,
    wear,
    addAndWear,
    owns,
  }
}

