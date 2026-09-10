import { useCallback, useEffect, useRef, useState } from "react"
import { Check, X } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { ModalOverlay } from "../../components/ui/ModalOverlay"

export type CropRect = {
  /** Normalized (0–1) center of the crop box. */
  cx: number
  cy: number
  /** Normalized (0–1) zoom relative to the base cover-fit size. 1 = cover fit. */
  zoom: number
}

type DragMode = "move" | "zoom" | null

/**
 * Interactive crop editor for avatar (square) and banner (3:1) uploads.
 * Returns the chosen crop rect through onConfirm; renders nothing when closed.
 *
 * The image is object-fit inside a fixed preview box; the crop window is the
 * box itself, and the user drags the image and uses a zoom slider to choose
 * which part shows through.
 */
export function ImageCropModal({
  open,
  file,
  aspect,
  title,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  file: File | null
  aspect: number
  title: string
  busy?: boolean
  onClose: () => void
  onConfirm: (crop: CropRect) => void
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [crop, setCrop] = useState<CropRect>({ cx: 0.5, cy: 0.5, zoom: 1 })
  const dragState = useRef<{ mode: DragMode; startX: number; startY: number } | null>(null)

  // Load the picked file into an object URL for previewing.
  useEffect(() => {
    if (!open || !file) {
      setObjectUrl(null)
      setImgSize(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    const img = new Image()
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight })
    img.src = url
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file, open])

  // Reset the crop whenever a new image arrives.
  useEffect(() => {
    if (open) setCrop({ cx: 0.5, cy: 0.5, zoom: 1 })
  }, [open, objectUrl])

  const onPointerDown = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      if (!mode) return
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      dragState.current = { mode, startX: e.clientX, startY: e.clientY }
    },
    [],
  )

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragState.current
    if (!drag) return
    if (drag.mode === "move") {
      setCrop((c) => ({
        ...c,
        cx: clamp01(c.cx + e.movementX / PREVIEW_SIZE),
        cy: clamp01(c.cy + e.movementY / PREVIEW_SIZE),
      }))
    }
  }, [])

  const onPointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  const zoomStep = (dir: 1 | -1) => {
    setCrop((c) => ({ ...c, zoom: clamp(c.zoom + dir * 0.1, 1, 3) }))
  }

  const canConfirm = Boolean(file && imgSize)

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      label={title}
      panelClassName="modal-panel relative w-full max-w-sm rounded-2xl border border-white/10 bg-base-300 p-5 shadow-2xl"
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle absolute right-2 top-2 text-base-content/70 hover:text-base-content"
        aria-label="Close"
        onClick={onClose}
      >
        <Icon icon={X} className="size-4" />
      </button>

      <h2 className="pr-8 text-lg font-extrabold">{title}</h2>

      {/* Preview + drag surface */}
      <div
        className="mt-4 select-none overflow-hidden rounded-xl border border-white/10 bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[size:16px_16px]"
        style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE / aspect }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {objectUrl ? (
          <div
            className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
            onPointerDown={onPointerDown("move")}
          >
            <img
              src={objectUrl}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={imgStyle(imgSize, aspect, crop)}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
            />
          </div>
        ) : (
          <div className="grid h-full place-items-center">
            <span className="loading loading-spinner text-primary" />
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle font-black"
          aria-label="Zoom out"
          disabled={!canConfirm || busy}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => zoomStep(-1)}
        >
          −
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={crop.zoom}
          disabled={!canConfirm || busy}
          aria-label="Zoom"
          className="range range-primary range-xs flex-1"
          onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
        />
        <button
          type="button"
          className="btn btn-ghost btn-xs btn-circle font-black"
          aria-label="Zoom in"
          disabled={!canConfirm || busy}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => zoomStep(1)}
        >
          +
        </button>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost btn-sm rounded-full font-bold" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-full font-extrabold"
          disabled={!canConfirm || busy}
          onClick={() => onConfirm(crop)}
        >
          {busy ? <span className="loading loading-spinner loading-xs" /> : null}
          <Icon icon={Check} className="size-3.5" />
          Apply crop
        </button>
      </div>
    </ModalOverlay>
  )
}

const PREVIEW_SIZE = 288

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * Compute the CSS transform for the preview image so that the crop rect
 * (cx, cy, zoom) shows through the fixed preview window. Mirrors the math in
 * applyCropToCanvas so what the user sees is exactly what gets uploaded.
 */
function imgStyle(
  imgSize: { w: number; h: number } | null,
  aspect: number,
  crop: CropRect,
): React.CSSProperties {
  if (!imgSize) return { visibility: "hidden" }

  // Base "cover" scale: smallest scale where the image fills the window.
  const coverScale = Math.max(PREVIEW_SIZE / imgSize.w, PREVIEW_SIZE / aspect / imgSize.h)
  const scale = coverScale * crop.zoom
  const drawW = imgSize.w * scale
  const drawH = imgSize.h * scale

  // Center the image, then offset so the (cx, cy) point sits in the window's
  // center, clamped so the image always covers the window.
  const baseX = (PREVIEW_SIZE - drawW) / 2
  const baseY = (PREVIEW_SIZE / aspect - drawH) / 2
  const maxX = 0
  const minX = PREVIEW_SIZE - drawW
  const maxY = 0
  const minY = PREVIEW_SIZE / aspect - drawH
  const x = clamp(baseX - (crop.cx - 0.5) * drawW, Math.min(minX, maxX), Math.max(minX, maxX))
  const y = clamp(baseY - (crop.cy - 0.5) * drawH, Math.min(minY, maxY), Math.max(minY, maxY))

  return {
    width: drawW,
    height: drawH,
    transform: `translate(${x}px, ${y}px)`,
  }
}
