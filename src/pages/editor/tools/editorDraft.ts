import type { EditorControls, LimbId } from "./editorControls"

export const EDITOR_DRAFT_KEY = "looms:editor_draft_v1"

// Random per page load. sessionStorage survives reloads in the same tab, so
// drafts are stamped with this id; a reader that sees a different id knows the
// draft came from an earlier page load and discards it.
export const DRAFT_SESSION_ID = createLoadSessionId()

function createLoadSessionId() {
  const runtimeCrypto = globalThis.crypto
  if (runtimeCrypto?.randomUUID) return runtimeCrypto.randomUUID()
  return `load-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export interface EditorDraftData extends EditorControls {
  version: 1
  sessionId: string
  pieceId: string | null
  base: string
  paint: string
}

type EditorDraftInput = Omit<
  EditorDraftData,
  "base" | "paint" | "version" | "pieceId" | "sessionId"
> & {
  baseCanvas: HTMLCanvasElement
  paintCanvas: HTMLCanvasElement
}

const LIMBS: LimbId[] = [
  "head",
  "body",
  "rightArm",
  "leftArm",
  "rightLeg",
  "leftLeg",
]

function bytesToBase64(bytes: Uint8Array | Uint8ClampedArray) {
  let binary = ""
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBytes(b64: string) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function canvasToBase64(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  return bytesToBase64(ctx.getImageData(0, 0, 64, 64).data)
}

export function restoreCanvasFromBase64(canvas: HTMLCanvasElement, b64: string) {
  const bytes = base64ToBytes(b64)
  if (bytes.length !== 64 * 64 * 4) return false
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return false
  ctx.clearRect(0, 0, 64, 64)
  ctx.putImageData(new ImageData(new Uint8ClampedArray(bytes.buffer), 64, 64), 0, 0)
  return true
}

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/.test(value)
}

function stringOr<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback
}

function booleanOr(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function limbRecordOr(value: unknown, fallback: boolean): Record<LimbId, boolean> {
  const out = {} as Record<LimbId, boolean>
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  for (const limb of LIMBS) out[limb] = booleanOr(source[limb], fallback)
  return out
}

function hexArrayOr(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter(isHex).slice(0, 16)
    : fallback
}

/**
 * Saves the editor's pixel layers and control state to sessionStorage. Only
 * fresh sessions (no piece loaded) are snapshotted; piece sessions are
 * protected by the save-over flow and their drafts would never restore.
 */
export function saveEditorDraft(input: EditorDraftInput): void {
  const base = canvasToBase64(input.baseCanvas)
  const paint = canvasToBase64(input.paintCanvas)
  if (!base || !paint) return
  const data: EditorDraftData = {
    version: 1,
    sessionId: DRAFT_SESSION_ID,
    pieceId: null,
    model: input.model,
    base,
    paint,
    tool: input.tool,
    brushSize: input.brushSize,
    brushShape: input.brushShape,
    brushOpacity: input.brushOpacity,
    brushSoftness: input.brushSoftness,
    brushBlend: input.brushBlend,
    shadingMode: input.shadingMode,
    bucketMode: input.bucketMode,
    shapeKind: input.shapeKind,
    shapeFill: input.shapeFill,
    symmetry: input.symmetry,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    recentColors: input.recentColors.filter(isHex).slice(0, 16),
    bodyParts: input.bodyParts,
    armorParts: input.armorParts,
    gridVisible: input.gridVisible,
  }
  try {
    sessionStorage.setItem(EDITOR_DRAFT_KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable or full; the session just does not persist
  }
}

export function readEditorDraft(): EditorDraftData | null {
  let raw: string | null = null
  try {
    raw = sessionStorage.getItem(EDITOR_DRAFT_KEY)
  } catch {
    return null
  }
  if (!raw) return null
  try {
    const d = JSON.parse(raw) as Record<string, unknown>
    if (d.version !== 1 || d.pieceId != null) return null
    if (d.sessionId !== DRAFT_SESSION_ID) {
      // Draft written by an earlier page load: a reload or a new tab. Clear it.
      clearEditorDraft()
      return null
    }
    if (typeof d.base !== "string" || typeof d.paint !== "string") return null
    try {
      if (atob(d.paint).length !== 64 * 64 * 4) return null
    } catch {
      return null
    }
    return {
      version: 1,
      sessionId: d.sessionId as string,
      pieceId: null,
      model: stringOr(d.model, ["classic", "slim"] as const, "classic"),
      base: d.base,
      paint: d.paint,
      tool: stringOr(
        d.tool,
        ["pencil", "eraser", "bucket", "shading", "noise", "shape", "picker"] as const,
        "pencil",
      ),
      brushSize: clampNumber(d.brushSize, 1, 4, 1),
      brushShape: stringOr(d.brushShape, ["square", "circle"] as const, "square"),
      brushOpacity: clampNumber(d.brushOpacity, 0, 1, 1),
      brushSoftness: clampNumber(d.brushSoftness, 0, 1, 0),
      brushBlend: stringOr(
        d.brushBlend,
        ["normal", "multiply", "screen", "lighten", "darken", "overlay"] as const,
        "normal",
      ),
      shadingMode: stringOr(d.shadingMode, ["lighten", "darken"] as const, "lighten"),
      bucketMode: stringOr(
        d.bucketMode,
        [
          "connectedColors",
          "face",
          "element",
          "selectedElements",
          "colors",
        ] as const,
        "connectedColors",
      ),
      shapeKind: stringOr(d.shapeKind, ["rectangle", "ellipse"] as const, "rectangle"),
      shapeFill: stringOr(d.shapeFill, ["filled", "hollow"] as const, "filled"),
      symmetry: booleanOr(d.symmetry, false),
      primaryColor: isHex(d.primaryColor) ? d.primaryColor : "#3880ff",
      secondaryColor: isHex(d.secondaryColor) ? d.secondaryColor : "#ffffff",
      recentColors: hexArrayOr(d.recentColors, []),
      bodyParts: limbRecordOr(d.bodyParts, true),
      armorParts: limbRecordOr(d.armorParts, true),
      gridVisible: booleanOr(d.gridVisible, true),
    }
  } catch {
    return null
  }
}

export function clearEditorDraft(): void {
  try {
    sessionStorage.removeItem(EDITOR_DRAFT_KEY)
  } catch {
    // Storage unavailable; nothing to clear
  }
}
