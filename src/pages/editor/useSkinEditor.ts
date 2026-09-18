import { useCallback, useEffect, useRef, useState } from "react"
import type { SkinModel } from "../../skin/convert"
import {
  classicToSlimImageData,
  detectSkinModel,
  slimToClassicImageData,
} from "../../skin/convert"
import {
  interpolateLine,
  findCuboidFaceAtTexel,
  type Point,
} from "./tools/editorMath"
import { DEFAULT_BODY_ID } from "../../data/bodies"
import { composeSkin, outerPartsPainted } from "../../skin/compose"
import { createEditorHistory, type EditorHistory } from "./tools/editorHistory"
import {
  clearEditorDraft,
  readEditorDraft,
  restoreCanvasFromBase64,
  saveEditorDraft,
  type EditorDraftData,
} from "./tools/editorDraft"
import {
  applyBrush,
  applyColorJitter,
  applyEraser,
  applyShading,
  colorsFill,
  drawEllipse,
  drawRectangle,
  elementFill,
  faceFill,
  floodFill,
  getPixel,
  hexToRgba,
  rgbaToHex,
  selectedElementsFill,
  type BrushOptions,
  type FillOptions,
  type RgbaColor,
  type ShapeOptions,
} from "./tools/editorTools"
import { getMirroredTexel, getSymmetricPoints } from "./tools/editorSymmetry"
import { EDITOR_TOOL_DEFS } from "./tools/editorToolDefs"
import type { Piece } from "../../data/catalog"
import { useEditorBrush, type EditorBrushState } from "./tools/useEditorBrush"
import { useEditorColors, type EditorColorsState } from "./tools/useEditorColors"
import {
  ALL_VISIBLE,
  useEditorVisibility,
  type EditorVisibilityState,
} from "./tools/useEditorVisibility"
import type { EditorControls, PaintSession } from "./tools/editorControls"

export type {
  EditorControls,
  EditorTool,
  LimbId,
  PaintSession,
  ShadingMode,
  ShapeKind,
} from "./tools/editorControls"
export type { BucketMode, BrushShape, BrushBlendMode, ShapeFillMode } from "./tools/editorTools"

export interface SkinEditorState {
  bufferCanvas: HTMLCanvasElement
  paintCanvas: HTMLCanvasElement
  paintSession: PaintSession
  model: SkinModel
  setModel: (m: SkinModel) => void
  brush: EditorBrushState
  colors: EditorColorsState
  visibility: EditorVisibilityState
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  beginStroke: () => void
  applyStrokeAtTexel: (texel: Point, opts?: { resetSegment?: boolean }) => void
  endStroke: () => void
  commitShape: (start: Point, end: Point) => void
  loadPiece: (piece: Piece, textureCanvas: HTMLCanvasElement) => void
  subscribeTextureUpdate: (cb: () => void) => () => void
  saveDraft: () => void
  draftRestored: boolean
  pendingDraft: boolean
  restoreDraft: () => void
  discardDraft: () => void
}

export const EDITOR_MODEL_KEY = "looms:editor_model"

/**
 * Renders an immediate baseline mannequin onto the 64x64 canvas so the 3D model
 * and 2D canvas are never transparent/invisible while waiting for async assets.
 */
export function drawDefaultMannequin(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, 64, 64)
  ctx.fillStyle = "#cb9876" // Looms Warm default body tone

  // Head (0..32, 0..16)
  ctx.fillRect(0, 0, 32, 16)
  // Body (16..40, 16..32)
  ctx.fillRect(16, 16, 24, 16)
  // Right Arm (40..56, 16..32)
  ctx.fillRect(40, 16, 16, 16)
  // Right Leg (0..16, 16..32)
  ctx.fillRect(0, 16, 16, 16)
  // Left Leg (16..32, 48..64)
  ctx.fillRect(16, 48, 16, 16)
  // Left Arm (32..48, 48..64)
  ctx.fillRect(32, 48, 16, 16)

  // Face features on head front { x: 8, y: 8, w: 8, h: 8 }
  ctx.fillStyle = "#4a3328"
  ctx.fillRect(8, 8, 8, 2)
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(9, 12, 2, 1)
  ctx.fillRect(13, 12, 2, 1)
  ctx.fillStyle = "#3b271d"
  ctx.fillRect(10, 12, 1, 1)
  ctx.fillRect(13, 12, 1, 1)
  ctx.fillStyle = "#8d5b4c"
  ctx.fillRect(11, 14, 2, 1)

  // Base clothing accents on torso and limbs
  ctx.fillStyle = "#3b82f6"
  ctx.fillRect(20, 20, 8, 12)
  ctx.fillRect(40, 20, 16, 6)
  ctx.fillRect(32, 52, 16, 6)
  ctx.fillStyle = "#1e3a8a"
  ctx.fillRect(0, 20, 16, 12)
  ctx.fillRect(16, 52, 16, 12)
}

export function useSkinEditor(): SkinEditorState {
  const [model, setModelState] = useState<SkinModel>("classic")
  const [paintSession, setPaintSession] = useState<PaintSession>({
    kind: "fresh",
  })
  const brush = useEditorBrush()
  const colors = useEditorColors()
  const visibility = useEditorVisibility()

  const [draftRestored, setDraftRestored] = useState(false)

  // Undo / Redo tracking
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const [baseCanvas] = useState<HTMLCanvasElement>(() => {
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas")
      c.width = 64
      c.height = 64
      const ctx = c.getContext("2d", { willReadFrequently: true })
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        drawDefaultMannequin(ctx)
      }
      return c
    }
    return {} as HTMLCanvasElement
  })
  const baseCanvasRef = useRef(baseCanvas)
  baseCanvasRef.current = baseCanvas

  const [paintCanvas] = useState<HTMLCanvasElement>(() => {
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas")
      c.width = 64
      c.height = 64
      const ctx = c.getContext("2d", { willReadFrequently: true })
      if (ctx) {
        ctx.imageSmoothingEnabled = false
      }
      return c
    }
    return {} as HTMLCanvasElement
  })
  const paintCanvasRef = useRef(paintCanvas)
  paintCanvasRef.current = paintCanvas

  const [bufferCanvas] = useState<HTMLCanvasElement>(() => {
    if (typeof document !== "undefined") {
      const c = document.createElement("canvas")
      c.width = 64
      c.height = 64
      const ctx = c.getContext("2d", { willReadFrequently: true })
      if (ctx) {
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(baseCanvas, 0, 0)
        ctx.drawImage(paintCanvas, 0, 0)
      }
      return c
    }
    return {} as HTMLCanvasElement
  })
  const bufferCanvasRef = useRef(bufferCanvas)
  bufferCanvasRef.current = bufferCanvas

  const historyRef = useRef<EditorHistory | null>(null)
  if (!historyRef.current) {
    historyRef.current = createEditorHistory(50)
  }

  const listenersRef = useRef<Set<() => void>>(new Set())

  const notifyTextureUpdate = useCallback(() => {
    listenersRef.current.forEach((cb) => cb())
  }, [])

  const subscribeTextureUpdate = useCallback((cb: () => void) => {
    listenersRef.current.add(cb)
    return () => {
      listenersRef.current.delete(cb)
    }
  }, [])

  const compositeIntoBuffer = useCallback(() => {
    const buffer = bufferCanvasRef.current
    const bufferCtx = buffer?.getContext("2d", { willReadFrequently: true })
    const base = baseCanvasRef.current
    const paint = paintCanvasRef.current
    if (!bufferCtx || !base || !paint) return
    bufferCtx.clearRect(0, 0, 64, 64)
    bufferCtx.drawImage(base, 0, 0)
    bufferCtx.drawImage(paint, 0, 0)
  }, [])

  const syncHistoryState = useCallback(() => {
    if (historyRef.current) {
      setCanUndo(historyRef.current.canUndo())
      setCanRedo(historyRef.current.canRedo())
    }
  }, [])

  const setModel = useCallback(
    (m: SkinModel) => {
      // Repair pass: flipping the arm model remaps the paint layer's arm
      // columns (4px ↔ 3px) in one undoable step before the new model renders
      // against it. The gate trusts the model the work was authored in;
      // pixel sniffing alone misreads fresh 3-column paint as slim.
      const paint = paintCanvasRef.current
      const paintCtx = paint?.getContext("2d", { willReadFrequently: true })
      if (m !== model && paintCtx) {
        const current = paintCtx.getImageData(0, 0, 64, 64)
        const detected = detectSkinModel(current.data)
        if (detected !== "universal" && detected === model) {
          if (historyRef.current) {
            historyRef.current.push(current)
          }
          const repaired = m === "slim"
            ? classicToSlimImageData(current)
            : slimToClassicImageData(current)
          paintCtx.putImageData(repaired, 0, 0)
          compositeIntoBuffer()
          syncHistoryState()
        }
      }
      setModelState(m)
      try {
        sessionStorage.setItem(EDITOR_MODEL_KEY, m)
      } catch {
        // Storage unavailable; the model choice just does not persist
      }
    },
    [model, compositeIntoBuffer, syncHistoryState],
  )

  // Draft recovery. Restoring is explicit: the EditorPage shows a resume
  // prompt, and only restoreDraft() rehydrates pixels and controls.
  const pendingDraftRef = useRef<EditorDraftData | null>(readEditorDraft())
  const [pendingDraft, setPendingDraft] = useState(() => pendingDraftRef.current != null)

  const restoreDraft = useCallback(() => {
    const draft = pendingDraftRef.current
    if (!draft) {
      setPendingDraft(false)
      return
    }
    restoreCanvasFromBase64(paintCanvasRef.current, draft.paint)
    setModelState(draft.model)
    brush.patch(draft)
    colors.restore(draft)
    visibility.patch({
      bodyParts: draft.bodyParts,
      armorParts: draft.armorParts,
    })
    compositeIntoBuffer()
    notifyTextureUpdate()
    pendingDraftRef.current = null
    setPendingDraft(false)
    setDraftRestored(true)
  }, [brush, colors, visibility, compositeIntoBuffer, notifyTextureUpdate])

  const discardDraft = useCallback(() => {
    clearEditorDraft()
    pendingDraftRef.current = null
    setPendingDraft(false)
    // A discarded draft is a fresh open: second layer defaults to what the
    // (empty) paint layer actually paints, which is off for every limb.
    visibility.patch({
      bodyParts: visibility.data.bodyParts,
      armorParts: outerPartsPainted(paintCanvasRef.current),
    })
  }, [visibility])

  // Fresh opens start with the second layer off unless the paint layer
  // already paints one; restoring a draft applies the session's saved state.
  // Runs once on open: bodyParts keep their all-on defaults.
  useEffect(() => {
    if (pendingDraftRef.current) return
    visibility.patch({
      bodyParts: ALL_VISIBLE,
      armorParts: outerPartsPainted(paintCanvasRef.current),
    })
  }, [visibility.patch])

  const paintSessionRef = useRef(paintSession)
  paintSessionRef.current = paintSession

  const draftSnapshotRef = useRef<EditorControls>({
    model,
    ...brush.data,
    ...colors.data,
    ...visibility.data,
  })
  draftSnapshotRef.current = {
    model,
    ...brush.data,
    ...colors.data,
    ...visibility.data,
  }

  const saveDraft = useCallback(() => {
    // Piece sessions keep the pre-piece draft untouched; their texture is
    // guarded by the save-over flow, so a snapshot would never restore.
    if (paintSessionRef.current.kind === "piece") return
    const snap = draftSnapshotRef.current
    saveEditorDraft({
      ...snap,
      baseCanvas: baseCanvasRef.current,
      paintCanvas: paintCanvasRef.current,
    })
  }, [])

  // SessionStorage is per-tab and survives reloads inside the same tab, so a
  // snapshot on every departure plus tab-close covers every navigation path.
  useEffect(() => {
    const handleBeforeUnload = () => saveDraft()
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDraft()
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [saveDraft])

  // The locked base layer always renders the authentic default Looms body.
  useEffect(() => {
    let cancelled = false

    async function initBase() {
      const ctx = baseCanvasRef.current?.getContext("2d", {
        willReadFrequently: true,
      })
      if (!ctx) return
      try {
        const base = await composeSkin([], DEFAULT_BODY_ID, 0, model)
        if (cancelled) return
        ctx.clearRect(0, 0, 64, 64)
        ctx.drawImage(base, 0, 0)
        compositeIntoBuffer()
        notifyTextureUpdate()
      } catch {
        // Synchronous mannequin is already on the base layer
      }
    }

    void initBase()

    return () => {
      cancelled = true
    }
  }, [model, compositeIntoBuffer, notifyTextureUpdate])

  // Stroke execution
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<Point | null>(null)
  const strokeStartSnapshotRef = useRef<ImageData | null>(null)

  const captureSnapshot = useCallback((): ImageData | null => {
    const canvas = paintCanvasRef.current
    if (!canvas) return null
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return null
    return ctx.getImageData(0, 0, 64, 64)
  }, [])

  const beginStroke = useCallback(() => {
    isDrawingRef.current = true
    lastPointRef.current = null
    strokeStartSnapshotRef.current = captureSnapshot()
  }, [captureSnapshot])

  const applyStrokeAtTexel = useCallback(
    (texel: Point, opts?: { resetSegment?: boolean }) => {
      const paint = paintCanvasRef.current
      if (!paint) return
      const ctx = paint.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      const imgData = ctx.getImageData(0, 0, 64, 64)
      const data = imgData.data

      // Dropper tool reads what the user sees: the composite buffer
      if (brush.data.tool === "picker") {
        const bufferCtx = bufferCanvasRef.current?.getContext("2d", {
          willReadFrequently: true,
        })
        if (!bufferCtx) return
        const pixel = getPixel(bufferCtx.getImageData(0, 0, 64, 64).data, texel.x, texel.y, 64)
        if (pixel[3] > 0) {
          const hex = rgbaToHex(pixel[0], pixel[1], pixel[2])
          colors.setPrimaryColor(hex)
        }
        return
      }

      // Crossing a face seam starts a fresh segment instead of interpolating
      // a straight line across the UV atlas
      if (opts?.resetSegment) {
        lastPointRef.current = null
      }

      // Interpolate from last point if continuous drag
      const p0 = lastPointRef.current ?? texel
      const points = interpolateLine(p0, texel)
      lastPointRef.current = texel

      // Symmetry handling
      const pointsToApply = brush.data.symmetry
        ? getSymmetricPoints(points, model === "slim")
        : points

      let activeColorRgba: RgbaColor = hexToRgba(colors.data.primaryColor)

      if (brush.data.tool === "noise") {
        const jitteredHex = applyColorJitter(colors.data.primaryColor, 0.08)
        activeColorRgba = hexToRgba(jitteredHex)
      }

      const strokeOptions: BrushOptions = {
        shape: brush.data.brushShape,
        opacity: brush.data.brushOpacity,
        softness: brush.data.brushSoftness,
        blend: brush.data.brushBlend,
      }

      if (brush.data.tool === "bucket") {
        const fillOptions: FillOptions = {
          opacity: brush.data.brushOpacity,
          blend: brush.data.brushBlend,
        }
        // Flood and connected-color fills read their region from the composite
        // so boundaries match what the user sees, then write into the paint
        // layer.
        const compositeCtx = bufferCanvasRef.current?.getContext("2d", {
          willReadFrequently: true,
        })
        const compositeData = compositeCtx?.getImageData(0, 0, 64, 64).data
        switch (brush.data.bucketMode) {
          case "face":
            faceFill(data, texel, activeColorRgba, model === "slim", 64, fillOptions)
            break
          case "element":
            elementFill(data, texel, activeColorRgba, model === "slim", 64, fillOptions)
            break
          case "selectedElements":
            selectedElementsFill(
              data,
              activeColorRgba,
              model === "slim",
              64,
              { body: visibility.data.bodyParts, armor: visibility.data.armorParts },
              fillOptions,
            )
            break
          case "colors":
            colorsFill(data, texel, activeColorRgba, 64, fillOptions, compositeData)
            break
          default:
            floodFill(data, texel, activeColorRgba, 64, fillOptions, compositeData)
        }
      } else {
        // Face clipping: every stroke texel is clipped to the cuboid face it
        // lands on, so stamps and streaks never bleed across UV seams. Points
        // outside any named face (mirror offsets, seam gaps) are skipped.
        for (const pt of pointsToApply) {
          const faceHit = findCuboidFaceAtTexel(pt, model === "slim")
          if (!faceHit) continue
          const clippedOptions: BrushOptions = {
            ...strokeOptions,
            clip: faceHit.rect,
          }
          if (brush.data.tool === "pencil" || brush.data.tool === "noise") {
            applyBrush(data, pt, brush.data.brushSize, activeColorRgba, 64, clippedOptions)
          } else if (brush.data.tool === "eraser") {
            applyEraser(data, pt, brush.data.brushSize, 64, clippedOptions)
          } else if (brush.data.tool === "shading") {
            applyShading(data, pt, brush.data.brushSize, brush.data.shadingMode, 0.06, 64, clippedOptions)
          }
        }
      }

      ctx.putImageData(imgData, 0, 0)
      compositeIntoBuffer()
      notifyTextureUpdate()
    },
    [
      brush.data,
      colors.data,
      colors.setPrimaryColor,
      visibility.data,
      model,
      notifyTextureUpdate,
      compositeIntoBuffer,
    ],
  )

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null

    if (strokeStartSnapshotRef.current && historyRef.current) {
      historyRef.current.push(strokeStartSnapshotRef.current)
      syncHistoryState()
    }
    strokeStartSnapshotRef.current = null
  }, [syncHistoryState])

  // Shape tool: rasterize the dragged rectangle/ellipse in one commit so the
  // whole shape lands as a single undo entry (beginStroke snapshots first).
  const commitShape = useCallback(
    (start: Point, end: Point) => {
      const paint = paintCanvasRef.current
      if (!paint) return
      const ctx = paint.getContext("2d", { willReadFrequently: true })
      if (!ctx) return

      const imgData = ctx.getImageData(0, 0, 64, 64)
      const data = imgData.data
      const colorRgba = hexToRgba(colors.data.primaryColor)
      const slim = model === "slim"

      const drawAt = (s: Point, e: Point) => {
        const faceHit = findCuboidFaceAtTexel(s, slim)
        if (!faceHit) return
        const options: ShapeOptions = {
          fill: brush.data.shapeFill,
          thickness: brush.data.brushSize,
          opacity: brush.data.brushOpacity,
          blend: brush.data.brushBlend,
          clip: faceHit.rect,
        }
        if (brush.data.shapeKind === "ellipse") {
          drawEllipse(data, s, e, colorRgba, 64, options)
        } else {
          drawRectangle(data, s, e, colorRgba, 64, options)
        }
      }

      drawAt(start, end)
      if (brush.data.symmetry) {
        const mirroredStart = getMirroredTexel(start, slim)
        const mirroredEnd = getMirroredTexel(end, slim)
        if (mirroredStart && mirroredEnd) {
          drawAt(mirroredStart, mirroredEnd)
        }
      }

      ctx.putImageData(imgData, 0, 0)
      compositeIntoBuffer()
      notifyTextureUpdate()
    },
    [
      brush.data,
      colors.data,
      model,
      notifyTextureUpdate,
      compositeIntoBuffer,
    ],
  )

  const undo = useCallback(() => {
    const canvas = paintCanvasRef.current
    if (!canvas || !historyRef.current) return
    const current = captureSnapshot()
    if (!current) return

    const previous = historyRef.current.undo(current)
    if (previous) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      ctx?.putImageData(previous, 0, 0)
      compositeIntoBuffer()
      notifyTextureUpdate()
      syncHistoryState()
    }
  }, [captureSnapshot, compositeIntoBuffer, notifyTextureUpdate, syncHistoryState])

  const redo = useCallback(() => {
    const canvas = paintCanvasRef.current
    if (!canvas || !historyRef.current) return
    const current = captureSnapshot()
    if (!current) return

    const next = historyRef.current.redo(current)
    if (next) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true })
      ctx?.putImageData(next, 0, 0)
      compositeIntoBuffer()
      notifyTextureUpdate()
      syncHistoryState()
    }
  }, [captureSnapshot, compositeIntoBuffer, notifyTextureUpdate, syncHistoryState])

  // Piece sessions: seed the paint layer with an owned uploaded piece's
  // texture so the creator can repaint over it.
  const loadPiece = useCallback(
    (piece: Piece, textureCanvas: HTMLCanvasElement) => {
      const paint = paintCanvasRef.current
      if (!paint) return
      const ctx = paint.getContext("2d", { willReadFrequently: true })
      if (!ctx) return
      const snap = captureSnapshot()
      if (snap && historyRef.current) {
        historyRef.current.push(snap)
      }
      ctx.clearRect(0, 0, 64, 64)
      ctx.drawImage(textureCanvas, 0, 0)
      setPaintSession({ kind: "piece", piece })
      // A piece only opens with its second layer on for limbs it paints.
      visibility.patch({
        bodyParts: visibility.data.bodyParts,
        armorParts: outerPartsPainted(textureCanvas),
      })
      compositeIntoBuffer()
      notifyTextureUpdate()
      syncHistoryState()
    },
    [captureSnapshot, compositeIntoBuffer, notifyTextureUpdate, syncHistoryState, visibility],
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
        return
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault()
        redo()
        return
      }

      const key = e.key.toLowerCase()
      const toolDef = EDITOR_TOOL_DEFS.find(
        (t) => t.shortcut.toLowerCase() === key,
      )
      if (toolDef) brush.patch({ tool: toolDef.id })
      if (key === "x") colors.swapColors()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [brush.patch, colors.swapColors, redo, undo])

  return {
    bufferCanvas,
    paintCanvas,
    paintSession,
    model,
    setModel,
    brush,
    colors,
    visibility,
    canUndo,
    canRedo,
    undo,
    redo,
    beginStroke,
    applyStrokeAtTexel,
    endStroke,
    commitShape,
    loadPiece,
    subscribeTextureUpdate,
    saveDraft,
    draftRestored,
    pendingDraft,
    restoreDraft,
    discardDraft,
  }
}
