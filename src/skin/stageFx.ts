import { ISO_RIM_FILL } from "./thumbFx"

// Visual width of the rim band in CSS pixels; matches the old --iso-rim-x/y.
// Single-piece renders carry a lighter rim (thinner band, less opacity).
export const RIM_CSS_PX = 4
export const PIECE_RIM_CSS_PX = 3
export const RIM_OPACITY = 0.45
export const PIECE_RIM_OPACITY = 0.45

export function copySilhouette(from: HTMLCanvasElement, to: HTMLCanvasElement, fill: string) {
  if (to.width !== from.width || to.height !== from.height) {
    to.width = from.width
    to.height = from.height
  }
  const ctx = to.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, to.width, to.height)
  ctx.drawImage(from, 0, 0)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, to.width, to.height)
  ctx.globalCompositeOperation = "source-over"
}

/**
 * Live twin of the thumbFx rim: the frame eroded away from the light, tinted
 * with the rim fill — a band that hugs the lit edge INSIDE the figure so the
 * highlight overlays the render instead of outlining it.
 */
export function copyRimBand(
  from: HTMLCanvasElement,
  to: HTMLCanvasElement,
  fill: string,
  bandPx: number,
) {
  if (to.width !== from.width || to.height !== from.height) {
    to.width = from.width
    to.height = from.height
  }
  const ctx = to.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, to.width, to.height)
  ctx.drawImage(from, 0, 0)
  ctx.globalCompositeOperation = "destination-out"
  ctx.drawImage(from, -bandPx, bandPx)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, to.width, to.height)
  ctx.globalCompositeOperation = "source-over"
}

/**
 * Copy the WebGL frame into the stage's fx overlay canvases: a hard punch
 * shadow silhouette and the inner rim highlight band. Runs right after
 * viewer.render() so the overlays land on the same frame as the canvas.
 */
// Shared scratch buffer: paintStageFx runs synchronously per call, so one
// module-level canvas is safe across every live viewer on the page. Created
// lazily so importing the module stays DOM-free.
let scratch: HTMLCanvasElement | null = null
function getScratch() {
  return (scratch ??= document.createElement("canvas"))
}

export function paintStageFx(
  src: HTMLCanvasElement,
  [shadow, rim]: readonly (HTMLCanvasElement | null)[],
  cssPx: number,
  fxScale = 1,
) {
  if (src.width <= 0 || src.height <= 0) return
  // The overlays are CSS-stretched, so they can render below device
  // resolution: `fxScale` trades sub-pixel softness for 4x fewer pixels in
  // the readback-following copies (soft band + silhouette tolerate it).
  const fxW = Math.max(1, Math.round(src.width * fxScale))
  const fxH = Math.max(1, Math.round(src.height * fxScale))
  const scratch = getScratch()
  if (scratch.width !== fxW) scratch.width = fxW
  if (scratch.height !== fxH) scratch.height = fxH
  const sCtx = scratch.getContext("2d")
  if (!sCtx) return
  sCtx.clearRect(0, 0, fxW, fxH)
  sCtx.drawImage(src, 0, 0, fxW, fxH)

  if (shadow) copySilhouette(scratch, shadow, "#000")
  if (rim) {
    // The WebGL canvas may render at device-pixel resolution, so convert the
    // CSS-pixel band width into the fx canvas's own pixel space.
    const scale = src.clientWidth > 0 ? fxW / src.clientWidth : fxScale
    copyRimBand(scratch, rim, ISO_RIM_FILL, Math.max(2, Math.round(cssPx * scale)))
  }
}
