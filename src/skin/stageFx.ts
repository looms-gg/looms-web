import { ISO_RIM_FILL } from "./thumbFx"

// Visual width of the rim band in CSS pixels; matches the old --iso-rim-x/y.
// Single-piece renders carry a lighter rim (thinner band, less opacity).
export const RIM_CSS_PX = 4
export const PIECE_RIM_CSS_PX = 3
export const RIM_OPACITY = 0.45
export const PIECE_RIM_OPACITY = 0.45

/** Size a canvas to fxW×fxH when it differs, avoiding pixel-buffer resets. */
function sizeTo(canvas: HTMLCanvasElement, w: number, h: number) {
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
}

/** Draw the source scaled into an fxW×fxH canvas, then recolor the silhouette. */
export function copySilhouette(
  from: HTMLCanvasElement,
  to: HTMLCanvasElement,
  fill: string,
  fxW: number,
  fxH: number,
) {
  sizeTo(to, fxW, fxH)
  const ctx = to.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, fxW, fxH)
  ctx.drawImage(from, 0, 0, from.width, from.height, 0, 0, fxW, fxH)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, fxW, fxH)
  ctx.globalCompositeOperation = "source-over"
}

/**
 * Live twin of the thumbFx rim: the frame eroded away from the light, tinted
 * with the rim fill — a band that hugs the lit edge INSIDE the figure so the
 * highlight overlays the render instead of outlining it. The erosion shift is
 * in the destination canvas's own pixel space.
 */
export function copyRimBand(
  from: HTMLCanvasElement,
  to: HTMLCanvasElement,
  fill: string,
  bandPx: number,
  fxW: number,
  fxH: number,
) {
  sizeTo(to, fxW, fxH)
  const ctx = to.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, fxW, fxH)
  ctx.drawImage(from, 0, 0, from.width, from.height, 0, 0, fxW, fxH)
  ctx.globalCompositeOperation = "destination-out"
  ctx.drawImage(from, 0, 0, from.width, from.height, -bandPx, bandPx, fxW, fxH)
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, fxW, fxH)
  ctx.globalCompositeOperation = "source-over"
}

/**
 * Copy the WebGL frame into the stage's fx overlay canvases: a hard punch
 * shadow silhouette and the inner rim highlight band. Runs right after
 * viewer.render() so the overlays land on the same frame as the canvas.
 * Each overlay is fed straight from the WebGL canvas with one scaled
 * drawImage — no intermediate scratch pass.
 */
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
  // The WebGL canvas may render at device-pixel resolution, so convert the
  // CSS-pixel band width into the fx canvas's own pixel space.
  const scale = src.clientWidth > 0 ? fxW / src.clientWidth : fxScale
  if (shadow) copySilhouette(src, shadow, "#000", fxW, fxH)
  if (rim) copyRimBand(src, rim, ISO_RIM_FILL, Math.max(2, Math.round(cssPx * scale)), fxW, fxH)
}
