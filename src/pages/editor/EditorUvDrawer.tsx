import { memo, useEffect, useRef, useState, useCallback } from "react"
import { MagnifyingGlassMinus, MagnifyingGlassPlus, X } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { HoverTip } from "../../components/ui/HoverTip"
import type { Point } from "./tools/editorMath"
import type { SkinEditorState } from "./useSkinEditor"

const REGION_LABELS = [
  { text: "Head", x: 8, y: 3 },
  { text: "Hat", x: 40, y: 3 },
  { text: "R.Leg", x: 4, y: 18 },
  { text: "Body", x: 22, y: 18 },
  { text: "R.Arm", x: 44, y: 18 },
  { text: "R.Pant", x: 4, y: 34 },
  { text: "Jacket", x: 22, y: 34 },
  { text: "R.Sleeve", x: 44, y: 34 },
  { text: "L.Pant", x: 4, y: 50 },
  { text: "L.Leg", x: 20, y: 50 },
  { text: "L.Arm", x: 36, y: 50 },
  { text: "L.Sleeve", x: 52, y: 50 },
]

export const EditorUvDrawer = memo(function EditorUvDrawer({
  editor,
  open,
  onClose,
}: {
  editor: SkinEditorState
  open: boolean
  onClose: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  // Sheet strokes coalesce to one application per animation frame; the sheet
  // lives next to the 3D stage and shares its per-event texture updates, which
  // would otherwise run a full composite + upload on every pointermove.
  const pendingTexelRef = useRef<Point | null>(null)
  const strokeRafRef = useRef<number | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  const [shapePreview, setShapePreview] = useState<{ start: Point; end: Point } | null>(null)

  const {
    bufferCanvas,
    subscribeTextureUpdate,
    beginStroke,
    applyStrokeAtTexel,
    endStroke,
    commitShape,
  } = editor
  const { tool, shapeKind = "rectangle" } = editor.brush.data
  const { primaryColor } = editor.colors.data

  const drainStroke = useCallback(() => {
    if (strokeRafRef.current !== null) {
      cancelAnimationFrame(strokeRafRef.current)
      strokeRafRef.current = null
    }
    const texel = pendingTexelRef.current
    pendingTexelRef.current = null
    if (texel) applyStrokeAtTexel(texel)
  }, [applyStrokeAtTexel])

  const scheduleStroke = useCallback(
    (texel: Point) => {
      pendingTexelRef.current = texel
      if (strokeRafRef.current !== null) return
      strokeRafRef.current = requestAnimationFrame(() => {
        strokeRafRef.current = null
        const pending = pendingTexelRef.current
        pendingTexelRef.current = null
        if (pending) applyStrokeAtTexel(pending)
      })
    },
    [applyStrokeAtTexel],
  )

  useEffect(
    () => () => {
      if (strokeRafRef.current !== null) cancelAnimationFrame(strokeRafRef.current)
    },
    [],
  )

  // Closing the sheet mid-drag drops any queued texel instead of painting it
  // after the pointer is gone.
  useEffect(() => {
    if (open) return
    if (strokeRafRef.current !== null) {
      cancelAnimationFrame(strokeRafRef.current)
      strokeRafRef.current = null
    }
    pendingTexelRef.current = null
  }, [open])

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bufferCanvas, 0, 0, canvas.width, canvas.height)
  }, [bufferCanvas])

  useEffect(() => {
    if (!open) return
    redrawCanvas()
    return subscribeTextureUpdate(redrawCanvas)
  }, [open, redrawCanvas, subscribeTextureUpdate])

  if (!open) return null

  const getTexelFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = Math.min(
      63,
      Math.max(0, Math.floor(((e.clientX - rect.left) / rect.width) * 64)),
    )
    const y = Math.min(
      63,
      Math.max(0, Math.floor(((e.clientY - rect.top) / rect.height) * 64)),
    )
    return { x, y }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    const texel = getTexelFromPointer(e)
    if (!texel) return
    isDrawingRef.current = true
    beginStroke()
    if (tool === "shape") {
      setShapePreview({ start: texel, end: texel })
      return
    }
    applyStrokeAtTexel(texel)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return
    const texel = getTexelFromPointer(e)
    if (!texel) return
    if (tool === "shape") {
      setShapePreview((prev) => (prev ? { start: prev.start, end: texel } : null))
      return
    }
    scheduleStroke(texel)
  }

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    // Land the last queued texel before closing the stroke's undo entry.
    drainStroke()
    if (tool === "shape") {
      setShapePreview((prev) => {
        if (prev) commitShape(prev.start, prev.end)
        return null
      })
    }
    endStroke()
  }

  const baseDisplaySize = 256
  const currentSize = baseDisplaySize * zoom

  return (
    <div className="editor-uv-drawer absolute bottom-3 left-3 right-3 z-30 max-h-[70vh] flex flex-col rounded-lg editor-float p-3.5 md:left-auto md:w-96">
      <div className="flex items-center justify-between pb-2.5 border-b border-base-content/10">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-sm tracking-tight">2D UV Sheet</h3>
          <span className="badge badge-xs badge-neutral font-extrabold text-[10px]">64×64</span>
        </div>
        <div className="flex items-center gap-1">
          <HoverTip tip="Zoom Out">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle h-7 w-7 min-h-7 text-base-content/70 hover:text-base-content hover:bg-base-300 cursor-pointer"
              onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
              aria-label="Zoom out"
            >
              <Icon icon={MagnifyingGlassMinus} size="xs" />
            </button>
          </HoverTip>
          <span className="text-xs font-bold text-base-content/70 w-9 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <HoverTip tip="Zoom In">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-circle h-7 w-7 min-h-7 text-base-content/70 hover:text-base-content hover:bg-base-300 cursor-pointer"
              onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
              aria-label="Zoom in"
            >
              <Icon icon={MagnifyingGlassPlus} size="xs" />
            </button>
          </HoverTip>
          <div className="h-3.5 w-px bg-base-content/15 mx-1" />
          <button
            type="button"
            className="btn btn-ghost btn-xs btn-circle h-7 w-7 min-h-7 text-base-content/70 hover:text-base-content hover:bg-base-300 cursor-pointer"
            onClick={onClose}
            aria-label="Close 2D drawer"
          >
            <Icon icon={X} size="xs" />
          </button>
        </div>
      </div>

      <div className="relative mt-2 flex flex-1 items-center justify-center overflow-auto rounded-lg bg-base-300/60 p-2">
        <div
          className="relative select-none shadow-inner"
          style={{ width: currentSize, height: currentSize }}
        >
          {/* Transparency checkerboard background */}
          <div
            className="absolute inset-0 rounded-md border border-base-content/20"
            style={{
              backgroundImage:
                "linear-gradient(45deg, #80808022 25%, transparent 25%), linear-gradient(-45deg, #80808022 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #80808022 75%), linear-gradient(-45deg, transparent 75%, #80808022 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            }}
          />

          {/* 64x64 Canvas Display */}
          <canvas
            ref={canvasRef}
            width={256}
            height={256}
            aria-label="2D texture canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp}
          className="relative z-10 h-full w-full cursor-crosshair [image-rendering:pixelated]"
        />

        {/* Shape tool drag preview */}
        {shapePreview && (
          <div
            data-shape-preview
            className="pointer-events-none absolute z-20 border"
            style={{
              left: `${(Math.min(shapePreview.start.x, shapePreview.end.x) / 64) * 100}%`,
              top: `${(Math.min(shapePreview.start.y, shapePreview.end.y) / 64) * 100}%`,
              width: `${((Math.abs(shapePreview.end.x - shapePreview.start.x) + 1) / 64) * 100}%`,
              height: `${((Math.abs(shapePreview.end.y - shapePreview.start.y) + 1) / 64) * 100}%`,
              borderColor: primaryColor,
              borderRadius: shapeKind === "ellipse" ? "50%" : undefined,
              opacity: 0.9,
            }}
          />
        )}

          {/* Region Label Guidelines */}
          {showLabels ? (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
              {REGION_LABELS.map((lbl, idx) => (
                <div
                  key={idx}
                  className="absolute text-[8px] font-extrabold uppercase tracking-tight text-base-content/40"
                  style={{
                    left: `${(lbl.x / 64) * 100}%`,
                    top: `${(lbl.y / 64) * 100}%`,
                  }}
                >
                  {lbl.text}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-base-content/60 font-semibold px-1">
        <span>Click & drag to paint</span>
        <button
          type="button"
          onClick={() => setShowLabels((l) => !l)}
          className="hover:text-base-content cursor-pointer transition-colors"
        >
          {showLabels ? "Hide guides" : "Show guides"}
        </button>
      </div>
    </div>
  )
})

