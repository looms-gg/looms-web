import type { useStudioBoard } from "./useStudioBoard"

type Board = ReturnType<typeof useStudioBoard>

/**
 * Shared prop bundles for the studio panels. StudioPage and
 * StudioMobileShell spread these instead of restating the plumbing, so the
 * two shells cannot drift field-by-field; shell-specific overrides go after
 * the spread.
 */

export function studioRackProps(board: Board) {
  return {
    ownedCount: board.owned.length,
    ownedBySlot: board.ownedBySlot,
    racks: board.racks,
    rack: board.rack,
    equipped: board.equipped,
    onRack: board.setRack,
    onWear: (id: string) => (id.startsWith("eye-") ? board.wearEye(id) : board.wear(id)),
    onClear: board.clearSlot,
    bodies: board.bodies,
    body: board.body,
    bodyId: board.bodyId,
    bodyHue: board.bodyHue,
    bodyTint: board.bodyTint,
    hueOpen: board.hueOpen,
    equippedEyes: board.equipped.eyes,
    eyeOffset: board.eyeOffset,
    onPickTone: board.pickTone,
    onBodyHue: board.setBodyHue,
    onEyeOffset: board.setEyeOffset,
  }
}

export function studioStageProps(board: Board) {
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

export function studioLayersProps(board: Board) {
  return {
    body: board.body,
    bodyTint: board.bodyTint,
    bodyHue: board.bodyHue,
    model: board.model,
    stackTopFirst: board.stackTopFirst,
    onModel: board.setModel,
    onMove: board.moveStack,
    onClear: board.clearSlot,
    onOpenAppearance: () => board.setRack("appearance"),
  }
}
