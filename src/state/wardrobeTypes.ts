import type { Slot } from "../data/catalog"
import type { SkinModel } from "../skin/convert"
import type { Look, Persist } from "./persist"
import type { LookMetaPatch } from "./lookMeta"

export type WardrobeMutationResult = {
  error: Error | null
  inserted?: boolean
}

export type PatchResult = {
  next: Persist
  message?: string
  activeLook?: Look
}

export type PatchFn = (
  updater: (prev: Persist) => PatchResult,
  options?: { notify?: boolean },
) => void

export type WardrobeContextValue = Persist & {
  notice: string | null
  activeLook: Look | null
  setActiveLook: (look: Look | null) => void
  addToWardrobe: (pieceId: string, options?: { notify?: boolean }) => Promise<WardrobeMutationResult>
  removeFromWardrobe: (pieceId: string) => Promise<WardrobeMutationResult>
  wear: (pieceId: string, options?: { notify?: boolean }) => void
  addAndWear: (
    pieceId: string,
    options?: { notify?: boolean },
  ) => Promise<WardrobeMutationResult>
  clearSlot: (slot: Slot) => void
  moveStack: (pieceId: string, steps: number) => void
  reorderStack: (pieceId: string, targetIndex: number) => void
  setBody: (bodyId: string) => void
  setBodyHue: (hue: number) => void
  setModel: (model: SkinModel) => void
  loadLook: (look: Look, options?: { notify?: boolean }) => void
  saveLook: (name: string) => Promise<WardrobeMutationResult>
  overwriteLook: (id: string, name: string) => Promise<WardrobeMutationResult>
  renameLook: (id: string, name: string) => Promise<WardrobeMutationResult>
  updateLookMeta: (id: string, patch: LookMetaPatch) => Promise<WardrobeMutationResult>
  setPlayerName: (name: string) => void
  clearPlayerName: () => void
  owns: (pieceId: string) => boolean
  notify: (message: string) => void
  dismissNotice: () => void
}

