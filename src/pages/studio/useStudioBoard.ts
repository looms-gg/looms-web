import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react"
import { getPiece, SLOTS, type Piece, type Slot } from "../../data/catalog"
import { findMatchingLook, piecesFromEquipped } from "../../data/outfit"
import { bodies, bodyOrDefault } from "../../data/bodies"
import { parseEyeId, formatEyeId, clampEyeOffset } from "../../data/eyes"
import { tryDownloadSkinFile } from "../../skin/compose"
import { shiftHex } from "../../skin/hue"
import { useCloset, type Look } from "../../state/closet"
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
  return SLOTS.filter((slot) => ownedBySlot[slot].length > 0)
}

export function pickBodyTone(
  id: string,
  bodyId: string,
  setBody: (id: string) => void,
  setHueOpen: Dispatch<SetStateAction<boolean>>,
) {
  if (id === bodyId) {
    setHueOpen((open) => !open)
    return
  }
  setBody(id)
  setHueOpen(false)
}

export async function exportLook(
  outfit: Piece[],
  bodyId: string,
  bodyHue: number,
  name: string,
  model: SkinModel,
  notify: (message: string) => void,
) {
  const ok = await tryDownloadSkinFile(
    outfit,
    bodyId,
    bodyHue,
    name.trim() || "looms-look",
    model,
  )
  if (!ok) notify("Couldn't export that skin.")
}

export function useStudioBoard() {
  const session = useCloset()
  const { pieces: catalogPieces } = useCatalog()
  const matchingSavedLook =
    session.activeLook ??
    findMatchingLook(
      session.looks,
      session.equipped,
      session.bodyId,
      session.bodyHue,
      session.model,
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

  const [rack, setRack] = useState<StudioRackTab>("all")
  const [hueOpen, setHueOpen] = useState(false)
  const outfit = piecesFromEquipped(session.equipped, session.stack)
  const ownedBySlot = ownedBySlotMap(session.owned, catalogPieces)
  const racks = filledSlots(ownedBySlot)
  const body = bodyOrDefault(session.bodyId)
  const bodyTint = shiftHex(body.swatch, session.bodyHue)

  const parsedEye = session.equipped.eyes ? parseEyeId(session.equipped.eyes) : null
  const eyeOffset = parsedEye?.offset ?? 0

  const setEyeOffset = (offset: number) => {
    if (!session.equipped.eyes) return
    const { baseId } = parseEyeId(session.equipped.eyes)
    const clamped = clampEyeOffset(offset)
    session.wear(formatEyeId(baseId, clamped))
  }

  const wearEye = (id: string, offset?: number) => {
    const targetOffset = offset !== undefined ? offset : eyeOffset
    const { baseId } = parseEyeId(id)
    session.wear(formatEyeId(baseId, targetOffset))
  }

  return {
    ...session,
    name,
    setName,
    rack,
    setRack,
    hueOpen,
    outfit,
    ownedBySlot,
    racks,
    stackTopFirst: [...outfit].reverse(),
    body,
    bodyTint,
    bodies,
    eyeOffset,
    setEyeOffset,
    wearEye,
    pickTone: (id: string) =>
      pickBodyTone(id, session.bodyId, session.setBody, setHueOpen),
    confirmOverwriteLook,
    onSave: (event: FormEvent) => {
      event.preventDefault()
      const clean = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      const existing = session.looks.find(
        (l) => l.name.trim().toLowerCase() === clean.toLowerCase(),
      )
      if (existing) {
        setConfirmOverwriteLook(existing)
        return
      }
      session.saveLook(clean)
      setName(clean)
    },
    onConfirmOverwrite: () => {
      if (confirmOverwriteLook) {
        const clean =
          sanitizeText(name, MAX_LIMITS.LOOK_NAME) || confirmOverwriteLook.name
        session.overwriteLook(confirmOverwriteLook.id, clean)
        setName(clean)
        setConfirmOverwriteLook(null)
      }
    },
    onSaveAsNew: () => {
      const clean = sanitizeText(name, MAX_LIMITS.LOOK_NAME) || "Untitled look"
      session.saveLook(clean)
      setName(clean)
      setConfirmOverwriteLook(null)
    },
    onCancelOverwrite: () => {
      setConfirmOverwriteLook(null)
    },
    downloadSkin: () =>
      exportLook(outfit, session.bodyId, session.bodyHue, name, session.model, session.notify),
  }
}
