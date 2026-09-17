import {
  useCallback,
  useState,
  type FormEvent,
} from "react"
import { getPiece, COLLECTION_CATEGORY_ORDER, type Piece, type Slot } from "../../data/catalog"
import { findMatchingLook, piecesFromEquipped } from "../../data/outfit"
import { bodies, bodyOrDefault } from "../../data/bodies"
import { parseEyeId, formatEyeId, clampEyeOffset } from "../../data/eyes"
import { tryDownloadSkinFile } from "../../skin/compose"
import { shiftHex } from "../../skin/hue"
import { useWardrobe, type Look } from "../../state/wardrobe"
import { useCatalog } from "../../state/catalog"
import { emptyOwnedBySlot, type StudioRackTab } from "./studioOwned"
import type { SkinModel } from "../../skin/convert"
import { MAX_LIMITS, sanitizeText } from "../../lib/sanitize"

export type { StudioRackTab }

export function ownedBySlotMap(owned: string[], catalog: Piece[] = []) {
  const byId = new Map(catalog.map((piece) => [piece.id, piece]))
  const map = emptyOwnedBySlot()
  for (const id of owned) {
    const piece = byId.get(id) ?? getPiece(id)
    if (piece) map[piece.slot].push(piece)
  }
  return map
}

export function filledSlots(ownedBySlot: Record<Slot, Piece[]>) {
  return COLLECTION_CATEGORY_ORDER.filter((slot) => (ownedBySlot[slot]?.length ?? 0) > 0)
}

export function pickBodyTone(
  id: string,
  setBody: (id: string) => void,
) {
  setBody(id)
}

export async function exportLook(
  outfit: Piece[],
  bodyId: string,
  bodyHue: number,
  model: SkinModel,
  name: string,
  { notify }: { notify: (message: string) => void },
) {
  const ok = await tryDownloadSkinFile(
    outfit,
    bodyId,
    bodyHue,
    model,
    { filename: name.trim() || "looms-look" },
  )
  if (!ok) notify("Couldn't export that skin.")
}

function findLookByName(looks: Look[], name: string): Look | undefined {
  const target = name.trim().toLowerCase()
  return looks.find((l) => l.name.trim().toLowerCase() === target)
}

function useStudioLook(wardrobe: ReturnType<typeof useWardrobe>) {
  const matchingSavedLook =
    wardrobe.activeLook ??
    findMatchingLook(
      wardrobe.looks,
      wardrobe.equipped,
      wardrobe.bodyId,
      wardrobe.bodyHue,
      wardrobe.model,
    )
  const [prevLookId, setPrevLookId] = useState<string | null>(matchingSavedLook?.id ?? null)
  const [name, setName] = useState(matchingSavedLook?.name ?? "")
  const [confirmOverwriteLook, setConfirmOverwriteLook] = useState<Look | null>(null)

  if (matchingSavedLook && matchingSavedLook.id !== prevLookId) {
    setPrevLookId(matchingSavedLook.id)
    setName(matchingSavedLook.name)
  } else if (!matchingSavedLook && prevLookId !== null) {
    setPrevLookId(null)
  }

  const onSave = (event?: FormEvent) => {
    event?.preventDefault()
    const clean = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
    const existing = findLookByName(wardrobe.looks, clean)
    if (existing) {
      setConfirmOverwriteLook(existing)
      return
    }
    void wardrobe.saveLook(clean)
    setName(clean)
  }

  const onConfirmOverwrite = () => {
    if (confirmOverwriteLook) {
      const clean =
        sanitizeText(name, MAX_LIMITS.LOOK_NAME) || confirmOverwriteLook.name
      void wardrobe.overwriteLook(confirmOverwriteLook.id, clean)
      setName(clean)
      setConfirmOverwriteLook(null)
    }
  }

  const onSaveAsNew = () => {
    const clean = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
    void wardrobe.saveLook(clean)
    setName(clean)
    setConfirmOverwriteLook(null)
  }

  const onCancelOverwrite = () => {
    setConfirmOverwriteLook(null)
  }

  return {
    name,
    setName,
    confirmOverwriteLook,
    onSave,
    onConfirmOverwrite,
    onSaveAsNew,
    onCancelOverwrite,
  }
}

function useStudioEyes(
  equippedEyes: string | undefined,
  wear: (pieceId: string) => void,
) {
  const parsedEye = equippedEyes ? parseEyeId(equippedEyes) : null
  const eyeOffset = parsedEye?.offset ?? 0

  const setEyeOffset = (offset: number) => {
    if (!equippedEyes) return
    const { baseId } = parseEyeId(equippedEyes)
    const clamped = clampEyeOffset(offset)
    wear(formatEyeId(baseId, clamped))
  }

  const wearEye = (id: string, offset?: number) => {
    const targetOffset = offset !== undefined ? offset : eyeOffset
    const { baseId } = parseEyeId(id)
    wear(formatEyeId(baseId, targetOffset))
  }

  return {
    eyeOffset,
    setEyeOffset,
    wearEye,
  }
}

export function useStudioBoard() {
  const wardrobe = useWardrobe()
  const { pieces: catalogPieces } = useCatalog()
  const lookState = useStudioLook(wardrobe)
  const eyeState = useStudioEyes(wardrobe.equipped.eyes, wardrobe.wear)

  const [collectionSlot, setCollectionSlot] = useState<"all" | Slot>("all")
  const outfit = piecesFromEquipped(wardrobe.equipped, wardrobe.stack)
  const ownedBySlot = ownedBySlotMap(wardrobe.owned, catalogPieces)
  const racks = filledSlots(ownedBySlot)
  const body = bodyOrDefault(wardrobe.bodyId)
  const bodyTint = shiftHex(body.swatch, wardrobe.bodyHue)

  const pickTone = useCallback(
    (id: string) => wardrobe.setBody(id),
    [wardrobe.setBody],
  )

  const reorderStack = useCallback(
    (pieceId: string, visualTargetIndex: number) => {
      // In stackTopFirst, visual index 0 is topmost layer (last in stack).
      const targetIndex = Math.max(0, outfit.length - 1 - visualTargetIndex)
      wardrobe.reorderStack(pieceId, targetIndex)
    },
    [outfit.length, wardrobe.reorderStack],
  )

  const downloadSkin = useCallback(
    () =>
      exportLook(outfit, wardrobe.bodyId, wardrobe.bodyHue, wardrobe.model, lookState.name, {
        notify: wardrobe.notify,
      }),
    [outfit, wardrobe.bodyId, wardrobe.bodyHue, wardrobe.model, lookState.name, wardrobe.notify],
  )

  // Narrow handoff: expose only the wardrobe fields the studio panels
  // consume, so the page-to-state boundary stays minimal and greppable.
  // Anything else remains available directly via useWardrobe().
  return {
    owned: wardrobe.owned,
    ownedBySlot,
    racks,
    collectionSlot,
    setCollectionSlot,
    equipped: wardrobe.equipped,
    wear: wardrobe.wear,
    wearEye: eyeState.wearEye,
    clearSlot: wardrobe.clearSlot,
    moveStack: wardrobe.moveStack,
    reorderStack,
    setModel: wardrobe.setModel,
    body,
    bodyTint,
    bodies,
    bodyId: wardrobe.bodyId,
    bodyHue: wardrobe.bodyHue,
    setBodyHue: wardrobe.setBodyHue,
    model: wardrobe.model,
    outfit,
    stackTopFirst: [...outfit].reverse(),
    eyeOffset: eyeState.eyeOffset,
    setEyeOffset: eyeState.setEyeOffset,
    name: lookState.name,
    setName: lookState.setName,
    pickTone,
    confirmOverwriteLook: lookState.confirmOverwriteLook,
    onSave: lookState.onSave,
    onConfirmOverwrite: lookState.onConfirmOverwrite,
    onSaveAsNew: lookState.onSaveAsNew,
    onCancelOverwrite: lookState.onCancelOverwrite,
    downloadSkin,
  }
}
