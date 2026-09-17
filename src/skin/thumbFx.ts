// Bakes the signature looms thumb effects — the hard punch shadow and the
// inner rim highlight — directly into the thumbnail image, once.
//
// Why: the previous markup stacked 4 filtered copies of the figure per tile
// (shadow + 3 rim copies) and pushed each through SVG reference filters
// (filter: url(#iso-hard-black/white)). Firefox runs those as WebRender SVG
// filter passes (cs_svg_filter_node_frag) with large intermediate surfaces, so
// scrolling the Explore grid produced 60+ display-list builds/sec and multi-
// frame composites. Baking moves that cost to one-time canvas work at thumb
// render and makes every tile a single composited image.
//
// Visual recipe:
//  - shadow: hard silhouette in black, offset (-punchX, +punchY), 35% alpha
//  - rim: the figure's own edge band along the lit top/right sides (silhouette
//    eroded away from the light), tinted with the rim fill, faded in from the
//    left edge (transparent until 50%, full past 64%), and drawn OVER the
//    render as a translucent overlay — not outside it as an outline
export const ISO_RIM_FILL = "#d4cec2"

// Punch shadow offset (8px) for hard silhouette depth.
const OUTLINE = 8
const PUNCH_X = OUTLINE
const PUNCH_Y = OUTLINE
// Default rim band depth (4px) and opacity (0.45) for full figures and hero
// busts — subtle, crisp lit edge without overpowering the texture underneath.
// Zoomed piece crops pass a deeper band (6px) via PIECE_FX.
const DEFAULT_RIM = 2
const RIM_X = DEFAULT_RIM
const SHADOW_ALPHA = 0.35
// The rim rides on top of the render as a light tint, so texture stays
// visible through it.
const RIM_ALPHA = 0.45
// feComponentTransfer discrete tableValues="0 1": alpha ≥ 0.5 → fully opaque.
const ALPHA_THRESHOLD = 128

// Fill fraction of the canvas the normalized figure occupies. The card CSS
// (--iso-figure-size: 78%) displays the 6:7 canvas inside a 4:3 frame, which
// overflows vertically: the visible part of the canvas is only 82% of its
// height. W/H target the figure at ~63% of the card each way:
// W = 0.63/0.78, H = 0.63/1.213.
const FIGURE_FILL_H = 0.52
const FIGURE_FILL_W = 0.81

function rimMaskAt(x: number): number {
  // mask-image on the old .iso-thumb-rim: "to right", stops 0 / 50% / 58% /
  // 64% — expressed across the FIGURE, so every piece's rim fades over the
  // same fraction of its own width regardless of how wide the silhouette is.
  if (x <= 0.5) return 0
  if (x <= 0.6) return ((x - 0.5) / 0.1) * 0.4
  if (x <= 0.68) return 0.4 + ((x - 0.6) / 0.08) * 0.6
  return 1
}

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  return canvas
}

type OpaqueRect = { x: number; y: number; w: number; h: number }

/** Bounding box of non-transparent pixels (same threshold as the silhouette). */
function opaqueBounds(src: CanvasImageSource, width: number, height: number): OpaqueRect | null {
  const canvas = makeCanvas(width, height)
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(src, 0, 0, width, height)
  try {
    const data = ctx.getImageData(0, 0, width, height).data
    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] >= ALPHA_THRESHOLD) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    if (maxX < 0) return null
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
  } catch {
    return null
  }
}

/**
 * Every thumb fills the frame the same, no matter which camera shot produced
 * it: shoes were framed against the whole leg box, coats against a wider rig,
 * so items rendered at wildly different visual scales. Crop to the painted
 * figure, then rescale it onto a fixed fill fraction, centered. Pixel-snapped
 * so the crisp look survives.
 */
function normalizeFigure(
  src: CanvasImageSource,
  width: number,
  height: number,
  fillW = FIGURE_FILL_W,
  fillH = FIGURE_FILL_H,
): { canvas: HTMLCanvasElement; bounds: OpaqueRect } | null {
  const bounds = opaqueBounds(src, width, height)
  if (!bounds) return null
  const scale = Math.min(
    (width * fillW) / bounds.w,
    (height * fillH) / bounds.h,
  )
  const normalized = makeCanvas(width, height)
  const ctx = normalized.getContext("2d")
  if (!ctx) return null
  ctx.imageSmoothingEnabled = false
  const dw = bounds.w * scale
  const dh = bounds.h * scale
  const dx = Math.round((width - dw) / 2)
  const dy = Math.round((height - dh) / 2)
  ctx.drawImage(src, bounds.x, bounds.y, bounds.w, bounds.h, dx, dy, dw, dh)
  return { canvas: normalized, bounds: { x: dx, y: dy, w: dw, h: dh } }
}

function hardSilhouette(src: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = makeCanvas(width, height)
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("thumbFx: 2d context unavailable")
  ctx.drawImage(src, 0, 0, width, height)
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255
    data[i + 1] = 255
    data[i + 2] = 255
    data[i + 3] = data[i + 3] >= ALPHA_THRESHOLD ? 255 : 0
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

function recolor(silhouette: HTMLCanvasElement, color: string) {
  const ctx = silhouette.getContext("2d")
  if (!ctx) throw new Error("thumbFx: 2d context unavailable")
  ctx.globalCompositeOperation = "source-in"
  ctx.fillStyle = color
  ctx.fillRect(0, 0, silhouette.width, silhouette.height)
  ctx.globalCompositeOperation = "source-over"
}

function applyRimMask(layer: HTMLCanvasElement, figure: OpaqueRect) {
  const ctx = layer.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("thumbFx: 2d context unavailable")
  const { width, height } = layer
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      // Normalize against the FIGURE's own width, not the canvas: a narrow
      // piece centered in the canvas would otherwise sit inside the mask's
      // fade ramp and lose its rim while a wide piece kept a full one.
      const t = (x + 0.5 - figure.x) / figure.w
      data[i + 3] = data[i + 3] * rimMaskAt(t)
    }
  }
  ctx.putImageData(image, 0, 0)
}

/**
 * Encode a canvas as a PNG Blob when the browser supports it. Blob sources
 * skip the base64 encode/decode round-trip a data URL pays twice (once in JS
 * memory, once in the image loader), and IndexedDB stores Blobs directly.
 * Falls back to a data URL in environments without a working toBlob.
 */
export type ThumbImage = Blob | string

export function canvasToPng(canvas: HTMLCanvasElement): Promise<ThumbImage> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) resolve(blob)
        else resolve(canvas.toDataURL("image/png"))
      }, "image/png")
    } catch {
      resolve(canvas.toDataURL("image/png"))
    }
  })
}

/** Turn a cached ThumbImage into something the image loader can display. */
export function thumbImageToUrl(image: ThumbImage): string {
  return typeof image === "string" ? image : URL.createObjectURL(image)
}

/**
 * Composite shadow + rim + figure into a single PNG image (Blob, or a data
 * URL where toBlob is unavailable). Throws when canvas/2D is unavailable;
 * callers should fall back to the un-baked image.
 *
 * `normalize` (default true) crops to the figure and rescales it to the tile
 * fill. Pass false to bake the camera's own framing untouched — the hero bust
 * is already framed tightly and only shrinks when run through the tile fill.
 */
export async function compositeIsoThumbFx(
  src: CanvasImageSource,
  width: number,
  height: number,
  options?: {
    normalize?: boolean
    fillW?: number
    fillH?: number
    rim?: number
    rimAlpha?: number
    // Punch shadow offset. Callers rendering above 1x (hero busts) scale it
    // with the resolution so the baked shadow keeps its visual depth.
    punchX?: number
    punchY?: number
  },
): Promise<ThumbImage> {
  if (width <= 0 || height <= 0) throw new Error("thumbFx: empty source")

  const norm =
    options?.normalize === false
      ? null
      : normalizeFigure(src, width, height, options?.fillW, options?.fillH)
  const normalized = norm?.canvas ?? src
  const figure = norm?.bounds ?? { x: 0, y: 0, w: width, h: height }
  const silhouette = hardSilhouette(normalized, width, height)
  const rimX = options?.rim ?? RIM_X
  const rimAlpha = options?.rimAlpha ?? RIM_ALPHA

  const shadow = makeCanvas(width, height)
  {
    const ctx = shadow.getContext("2d")
    if (!ctx) throw new Error("thumbFx: 2d context unavailable")
    ctx.drawImage(silhouette, -(options?.punchX ?? PUNCH_X), options?.punchY ?? PUNCH_Y)
    recolor(shadow, "#000000")
  }

  const rim = makeCanvas(width, height)
  {
    const ctx = rim.getContext("2d")
    if (!ctx) throw new Error("thumbFx: 2d context unavailable")
    ctx.drawImage(silhouette, 0, 0)
    // Erode the silhouette away from the light (down-left): what survives is a
    // band hugging the lit top/right edges INSIDE the figure.
    ctx.globalCompositeOperation = "destination-out"
    ctx.drawImage(silhouette, -rimX, rimX)
    ctx.globalCompositeOperation = "source-over"
    recolor(rim, ISO_RIM_FILL)
    applyRimMask(rim, figure)
  }

  const out = makeCanvas(width, height)
  const ctx = out.getContext("2d")
  if (!ctx) throw new Error("thumbFx: 2d context unavailable")
  ctx.globalAlpha = SHADOW_ALPHA
  ctx.drawImage(shadow, 0, 0)
  ctx.globalAlpha = 1
  ctx.drawImage(normalized, 0, 0, width, height)
  // Overlay pass: source-atop keeps the tint on pixels the figure already
  // covers, so it never regrows into an outline.
  ctx.globalAlpha = rimAlpha
  ctx.globalCompositeOperation = "source-atop"
  ctx.drawImage(rim, 0, 0)
  ctx.globalCompositeOperation = "source-over"
  ctx.globalAlpha = 1
  return canvasToPng(out)
}
