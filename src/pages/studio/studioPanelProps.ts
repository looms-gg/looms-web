import type { useStudioBoard } from "./useStudioBoard"

type Board = ReturnType<typeof useStudioBoard>

/**
 * Shared prop bundles for the studio panels. StudioPage and
 * StudioMobileShell spread these instead of restating the plumbing, so the
 * two shells cannot drift field-by-field; shell-specific overrides go after
 * the spread.
 */

export function collectionProps(board: Board) {
  return {
    ownedCount: board.owned.length,
    ownedBySlot: board.ownedBySlot,
    racks: board.racks,
    category: board.collectionSlot,
    onCategory: board.setCollectionSlot,
    equipped: board.equipped,
    onWear: (id: string) => (id.startsWith("eye-") ? board.wearEye(id) : board.wear(id)),
    onClear: board.clearSlot,
    equippedEyes: board.equipped.eyes,
    eyeOffset: board.eyeOffset,
    onEyeOffset: board.setEyeOffset,
    bodyTint: board.bodyTint,
  }
}

export function stageProps(board: Board) {
  return {
    outfit: board.outfit,
    bodyId: board.bodyId,
    bodyHue: board.bodyHue,
    model: board.model,
    name: board.name,
    onName: board.setName,
    onSave: board.onSave,
    onDownload: board.downloadSkin,
    confirmOverwriteLook: board.confirmOverwriteLook,
    onConfirmOverwrite: board.onConfirmOverwrite,
    onSaveAsNew: board.onSaveAsNew,
    onCancelOverwrite: board.onCancelOverwrite,
  }
}

export function assemblyProps(board: Board) {
  return {
    body: board.body,
    bodies: board.bodies,
    bodyTint: board.bodyTint,
    bodyHue: board.bodyHue,
    model: board.model,
    stackTopFirst: board.stackTopFirst,
    onModel: board.setModel,
    onMove: board.moveStack,
    onReorder: board.reorderStack,
    onClear: board.clearSlot,
    onPickTone: board.pickTone,
    onBodyHue: board.setBodyHue,
  }
}

