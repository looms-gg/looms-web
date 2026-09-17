import { useCallback, useEffect, useRef, useState } from "react"
import {
  ArrowsOutCardinal,
  ArrowCounterClockwise,
  Check,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { CloseButton } from "../../components/ui/CloseButton"
import { ModalOverlay } from "../../components/ui/ModalOverlay"

export type CropRect = {
  /** Normalized (0–1) center of the crop box. */
  cx: number
  cy: number
  /** Normalized (0–1) zoom relative to the base cover-fit size. 1 = cover fit. */
  zoom: number
}

type DragMode = "move" | null

const DEFAULT_CROP: CropRect = { cx: 0.5, cy: 0.5, zoom: 1 }
const MAX_ZOOM = 3
const FALLBACK_VIEW = 400

/**
 * Interactive crop editor for avatar (square) and banner (3:1) uploads.
 * Returns the chosen crop rect through onConfirm; renders nothing when closed.
 *
 * The crop window is the preview box itself: the image is cover-fit behind it
 * and the user pans the image and zooms to choose which part shows through.
 * The mask previews the real output shape (circle for avatars, rounded rect
 * for banners).
 */
export function ImageCropModal({
  open,
  file,
  aspect,
  title,
  shape = "rect",
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean
  file: File | null
  aspect: number
  title: string
  /** Mask shown over the preview; avatars use "circle". */
  shape?: "rect" | "circle"
  busy?: boolean
  onClose: () => void
  onConfirm: (crop: CropRect) => void
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP)
  const [viewW, setViewW] = useState(FALLBACK_VIEW)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{
    mode: DragMode
    lastX: number
    lastY: number
  } | null>(null)

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
    if (open) setCrop(DEFAULT_CROP)
  }, [open, objectUrl])

  // The preview box is fluid, so drag math needs the rendered width in px.
  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width
        if (width > 0) setViewW(width)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const viewH = viewW / aspect

  const validCenter = useCallback(
    (c: CropRect, size: { w: number; h: number } | null, vw: number, vh: number): CropRect => {
      if (!size) return c
      const scale = coverScale(size, vw, vh)
      const drawW = size.w * scale
      const drawH = size.h * scale
      // Pan range shrinks to a point at zoom 1, so the center stays 0.5.
      const halfX = drawW > vw ? (drawW - vw) / (2 * drawW) : 0
      const halfY = drawH > vh ? (drawH - vh) / (2 * drawH) : 0
      return {
        ...c,
        cx: clamp(c.cx, 0.5 - halfX, 0.5 + halfX),
        cy: clamp(c.cy, 0.5 - halfY, 0.5 + halfY),
      }
    },
    [aspect],
  )

  const onPointerDown = useCallback(
    (mode: DragMode) => (e: React.PointerEvent) => {
      if (!mode) return
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      dragState.current = { mode, lastX: e.clientX, lastY: e.clientY }
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragState.current
      if (!drag) return
      const dx = e.clientX - drag.lastX
      const dy = e.clientY - drag.lastY
      drag.lastX = e.clientX
      drag.lastY = e.clientY
      if (drag.mode === "move" && imgSize) {
        setCrop((c) => {
          const scale = coverScale(imgSize, viewW, viewH) * c.zoom
          return validCenter(
            {
              ...c,
              // The image follows the cursor, so the centered crop point
              // shifts opposite the drag, scaled by the drawn image size.
              cx: c.cx - dx / (imgSize.w * scale),
              cy: c.cy - dy / (imgSize.h * scale),
            },
            imgSize,
            viewW,
            viewH,
          )
        })
      }
    },
    [aspect, imgSize, validCenter, viewH, viewW],
  )

  const onPointerUp = useCallback(() => {
    dragState.current = null
  }, [])

  const setZoom = useCallback(
    (next: number) => {
      setCrop((c) => validCenter({ ...c, zoom: clamp(next, 1, MAX_ZOOM) }, imgSize, viewW, viewH))
    },
    [imgSize, validCenter, viewH, viewW],
  )

  const zoomStep = (dir: 1 | -1) => setZoom(crop.zoom + dir * 0.1)

  const canConfirm = Boolean(file && imgSize)
  const circle = shape === "circle"
  const untouched = crop.cx === 0.5 && crop.cy === 0.5 && crop.zoom === 1

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      label={title}
      panelClassName="modal-panel relative w-full max-w-md rounded-[18px] border border-base-content/10 bg-base-300 p-5 shadow-2xl"
    >
      <div className="flex items-center gap-3 pr-8">
        <h2 className="text-lg font-extrabold tracking-tight text-balance">{title}</h2>
      </div>
      <p className="mt-0.5 text-xs text-pretty text-base-content/60">
        Drag to reposition, then zoom until it fits.
      </p>

      <CloseButton onClick={onClose} className="absolute right-3 top-3" />

      {/* Preview + drag surface */}
      <div
        ref={previewRef}
        className="group relative mt-4 w-full select-none overflow-hidden rounded-xl border border-base-content/10 bg-[repeating-conic-gradient(#333_0%_25%,#222_0%_50%)] bg-[size:16px_16px]"
        style={{ aspectRatio: aspect }}
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
              className="pointer-events-none absolute left-0 top-0 max-w-none"
              style={imgStyle(imgSize, crop, viewW, viewH)} />
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-0 border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] ${
                circle ? "rounded-[50%]" : ""
              }`} />
            {circle ? null : (
              <>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-4 top-1/2 border-t border-dashed border-white/20" />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-4 left-1/2 border-l border-dashed border-white/20" />
              </>
            )}
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white/85 opacity-100 transition-opacity duration-150 group-active:opacity-0"
            >
              <Icon icon={ArrowsOutCardinal} size="sm" />
              Drag to reposition
            </span>
          </div>
        ) : (
          <div className="grid h-full place-items-center">
            <span className="loading loading-spinner text-primary" />
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className="mt-3 flex items-center gap-1">
        <button
          type="button"
          className="btn btn-ghost btn-xs size-9 rounded-full transition-transform duration-150 ease-out hover:text-base-content active:scale-[0.96]"
          aria-label="Zoom out"
          disabled={!canConfirm || busy || crop.zoom <= 1}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => zoomStep(-1)}
        >
          <Icon icon={MagnifyingGlassMinus} size="md" />
        </button>
        <input
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.05}
          value={crop.zoom}
          disabled={!canConfirm || busy}
          aria-label="Zoom"
          className="crop-zoom-range h-5 flex-1"
          style={{ "--fill": `${((crop.zoom - 1) / (MAX_ZOOM - 1)) * 100}%` } as React.CSSProperties}
          onChange={(e) => setZoom(Number(e.target.value))} />
        <button
          type="button"
          className="btn btn-ghost btn-xs size-9 rounded-full transition-transform duration-150 ease-out hover:text-base-content active:scale-[0.96]"
          aria-label="Zoom in"
          disabled={!canConfirm || busy || crop.zoom >= MAX_ZOOM}
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => zoomStep(1)}
        >
          <Icon icon={MagnifyingGlassPlus} size="md" />
        </button>
        <span
          className="min-w-10 text-right text-xs font-bold tabular-nums text-base-content/60"
          aria-hidden
        >
          {Math.round(crop.zoom * 100)}%
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs size-9 rounded-full transition-transform duration-150 ease-out active:scale-[0.96]"
          aria-label="Reset crop"
          title="Reset crop"
          disabled={!canConfirm || busy || untouched}
          onClick={() => setCrop(DEFAULT_CROP)}
        >
          <Icon icon={ArrowCounterClockwise} size="sm" />
        </button>
      </div>

      <div className="mt-5 flex justify-end gap-2 border-t border-base-content/10 pt-4">
        <button
          type="button"
          className="btn btn-ghost btn-sm rounded-full font-bold transition-transform duration-150 ease-out active:scale-[0.96]"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm rounded-full font-extrabold transition-transform duration-150 ease-out active:scale-[0.96]"
          disabled={!canConfirm || busy}
          onClick={() => onConfirm(crop)}
        >
          {busy ? <span className="loading loading-spinner loading-xs" /> : null}
          <Icon icon={Check} size="sm" />
          Apply crop
        </button>
      </div>
    </ModalOverlay>
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function coverScale(
  imgSize: { w: number; h: number },
  viewW: number,
  viewH: number,
): number {
  return Math.max(viewW / imgSize.w, viewH / imgSize.h)
}

/**
 * Compute the CSS transform for the preview image so that the crop rect
 * (cx, cy, zoom) shows through the fixed preview window. Mirrors the math in
 * fitCropDraw so what the user sees is exactly what gets uploaded.
 */
function imgStyle(
  imgSize: { w: number; h: number } | null,
  crop: CropRect,
  viewW: number,
  viewH: number,
): React.CSSProperties {
  if (!imgSize) return { visibility: "hidden" }

  const scale = coverScale(imgSize, viewW, viewH) * crop.zoom
  const drawW = imgSize.w * scale
  const drawH = imgSize.h * scale

  // Center the image, then offset so the (cx, cy) point sits in the window's
  // center, clamped so the image always covers the window.
  const baseX = (viewW - drawW) / 2
  const baseY = (viewH - drawH) / 2
  const x = clamp(baseX - (crop.cx - 0.5) * drawW, viewW - drawW, 0)
  const y = clamp(baseY - (crop.cy - 0.5) * drawH, viewH - drawH, 0)

  return {
    width: drawW,
    height: drawH,
    transform: `translate(${x}px, ${y}px)`,
  }
}
