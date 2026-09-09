// Bakes the signature looms thumb effects — the hard punch shadow and the
// multi-direction rim highlight — directly into the thumbnail image, once.
//
// Why: the previous markup stacked 4 filtered copies of the figure per tile
// (shadow + 3 rim copies) and pushed each through SVG reference filters
// (filter: url(#iso-hard-black/white)). Firefox runs those as WebRender SVG
// filter passes (cs_svg_filter_node_frag) with large intermediate surfaces, so
// scrolling the Explore grid produced 60+ display-list builds/sec and multi-
// frame composites. Baking moves that cost to one-time canvas work at thumb
// render and makes every tile a single composited image.
//
// Visual recipe (mirrors the old CSS layers in index.css):
//  - shadow: hard silhouette in black, offset (-punchX, +punchY), 35% alpha
//  - rim: hard silhouette in rim fill, offset (+rimX, ±rimY), unioned, then
//    faded in from the left edge (transparent until 50%, full past 64%)
export const ISO_RIM_FILL = "#e8e4dc"

const PUNCH_X = 10
const PUNCH_Y = 5
const RIM_X = 3
const RIM_Y = 3
const SHADOW_ALPHA = 0.35
// feComponentTransfer discrete tableValues="0 1": alpha ≥ 0.5 → fully opaque.
const ALPHA_THRESHOLD = 128

const bakedUrls = new Map<string, string>()

function rimMaskAt(x: number): number {
  // mask-image on the old .iso-thumb-rim: "to right", stops 0 / 50% / 58% /
  // 64% — expressed in tile space, where the figure image occupied the middle
  // 78% (--iso-figure-size). Converted to image space: (stop−0.11)/0.78.
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

function applyRimMask(layer: HTMLCanvasElement) {
  const ctx = layer.getContext("2d", { willReadFrequently: true })
  if (!ctx) throw new Error("thumbFx: 2d context unavailable")
  const { width, height } = layer
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      data[i + 3] = data[i + 3] * rimMaskAt((x + 0.5) / width)
    }
  }
  ctx.putImageData(image, 0, 0)
}

/**
 * Composite shadow + rim + figure into a single PNG data URL. Throws when
 * canvas/2D is unavailable; callers should fall back to the un-baked image.
 */
export function compositeIsoThumbFx(
  src: CanvasImageSource,
  width: number,
  height: number,
): string {
  if (width <= 0 || height <= 0) throw new Error("thumbFx: empty source")

  const silhouette = hardSilhouette(src, width, height)

  const shadow = makeCanvas(width, height)
  {
    const ctx = shadow.getContext("2d")
    if (!ctx) throw new Error("thumbFx: 2d context unavailable")
    ctx.drawImage(silhouette, -PUNCH_X, PUNCH_Y)
    recolor(shadow, "#000000")
  }

  const rim = makeCanvas(width, height)
  {
    const ctx = rim.getContext("2d")
    if (!ctx) throw new Error("thumbFx: 2d context unavailable")
    ctx.drawImage(silhouette, RIM_X, -RIM_Y)
    ctx.drawImage(silhouette, RIM_X, 0)
    ctx.drawImage(silhouette, RIM_X, RIM_Y)
    recolor(rim, ISO_RIM_FILL)
    applyRimMask(rim)
  }

  const out = makeCanvas(width, height)
  const ctx = out.getContext("2d")
  if (!ctx) throw new Error("thumbFx: 2d context unavailable")
  ctx.globalAlpha = SHADOW_ALPHA
  ctx.drawImage(shadow, 0, 0)
  ctx.globalAlpha = 1
  ctx.drawImage(rim, 0, 0)
  ctx.drawImage(src, 0, 0, width, height)
  return out.toDataURL("image/png")
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`thumbFx: image failed to load: ${src}`))
    img.src = src
  })
}

/**
 * Bake fx into an image URL (static pre-rendered thumbs). Returns the baked
 * data URL, or the original URL when baking is not possible (load failure,
 * no canvas) so callers degrade gracefully to an fx-less figure.
 */
export async function bakeIsoThumbFx(src: string): Promise<string> {
  const cached = bakedUrls.get(src)
  if (cached) return cached
  try {
    const img = await loadImage(src)
    const baked = compositeIsoThumbFx(img, img.naturalWidth, img.naturalHeight)
    bakedUrls.set(src, baked)
    return baked
  } catch {
    return src
  }
}
