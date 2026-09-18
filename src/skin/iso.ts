import { SkinViewer } from "skinview3d"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { preparePreview, type Group, type Piece } from "../data/catalog"
import { composePieceSkin, composeSkin, FULL_GROUPS, groupsFromAtlas, partsFromAtlas, type SkinPart } from "./compose"
import { runOnceInflight } from "./inflight"
import {
  applyGroupFocus,
  crispSkinTexture,
  lightSkinViewer,
  pauseViewerLoop,
  viewerModelName,
} from "./viewer"
import { ensureModel, type SkinModel } from "./convert"
import { getStoredThumb, setStoredThumb } from "./thumbCache"
import { isoPieceCacheKey, skinHash } from "./thumbKeys"
import {
  canvasToPng,
  compositeIsoThumbFx,
  thumbImageToUrl,
  type ThumbImage,
} from "./thumbFx"
import { washFromCanvas } from "./wash"

export type IsoThumbResult = {
  url: string
  wash: string
}

type Prepared = {
  skin: HTMLCanvasElement
  wash: string
  group: Group | "full"
  covers: Group[]
  coverSpan: number
  parts?: SkinPart[]
  model: "slim" | "default"
  bakeFx: boolean
  fx?: { rim?: number; rimAlpha?: number; fillW?: number; fillH?: number }
}

type Job = {
  key: string
  prepare: () => Promise<Prepared>
  resolve: (res: IsoThumbResult) => void
  reject: (error: unknown) => void
  priority: boolean
}

const memCache = new Map<string, IsoThumbResult>()
const inflight = new Map<string, Promise<IsoThumbResult>>()

/** IndexedDB payload: the encoded PNG (Blob preferred, data URL fallback). */
type StoredThumb = { png: ThumbImage; wash: string }
const queue: Job[] = []
let pumping = false
let pumpQueued = false
let viewer: SkinViewer | null = null

function getIsoViewer() {
  if (viewer) return viewer
  try {
    const next = new SkinViewer({
      canvas: document.createElement("canvas"),
      // 2× the display size so the normalization crop still has real detail to
      // sample — a 180×210 canvas magnified by the figure crop then again by
      // the CSS tile scale turned small items mushy.
      width: 360,
      height: 420,
      renderPaused: true,
    })
    lightSkinViewer(next)
    crispSkinTexture(next)
    viewer = next
    return next
  } catch (err) {
    viewer = null
    throw err
  }
}

function takeNextJob() {
  const urgent = queue.findIndex((job) => job.priority)
  if (urgent >= 0) return queue.splice(urgent, 1)[0]
  return queue.shift()
}

function schedulePump() {
  if (pumpQueued || pumping) return
  pumpQueued = true
  queueMicrotask(() => {
    pumpQueued = false
    pump()
  })
}

function enqueue(key: string, prepare: () => Promise<Prepared>, priority = false) {
  const hit = memCache.get(key)
  if (hit) return Promise.resolve(hit)

  const jobPromise = new Promise<IsoThumbResult>((resolve, reject) => {
    queue.push({ key, prepare, resolve, reject, priority })
    schedulePump()
  })
  return jobPromise
}

/** Look / outfit renders use a thinner, subtler rim than zoomed pieces to keep
 *  full characters crisp without an overpowering white band. */
export const OUTFIT_FX = { rim: 4, rimAlpha: 0.45 } as const

/** Piece renders carry a slightly deeper rim band because zoomed pieces (hair,
 *  hats) read too thin at full-character widths. */
export const PIECE_FX = { rim: 6, rimAlpha: 0.45 } as const

// Normalization fill by painted body-group span. Single-limb pieces keep the
// original tile presence; head-to-toe garments read closer to full figures
// instead of being shrunk to the same fixed fill as a hat.
const SPAN_FILL: Record<number, { fillW: number; fillH: number }> = {
  1: { fillW: 0.81, fillH: 0.52 },
  2: { fillW: 0.87, fillH: 0.58 },
  3: { fillW: 0.92, fillH: 0.64 },
}

function spanFill(span: number) {
  return SPAN_FILL[Math.min(3, Math.max(1, span))] ?? SPAN_FILL[1]
}

/** Bake shadow+rim into a freshly rendered viewer canvas (same-task read). */
function reviveStored(stored: StoredThumb): IsoThumbResult {
  return { url: thumbImageToUrl(stored.png), wash: stored.wash }
}

async function bakeViewerCanvas(
  v: SkinViewer,
  bakeFx: boolean,
  fx?: Prepared["fx"],
): Promise<ThumbImage> {
  if (!bakeFx) return canvasToPng(v.canvas)
  try {
    return await compositeIsoThumbFx(v.canvas, v.canvas.width, v.canvas.height, fx)
  } catch {
    return canvasToPng(v.canvas)
  }
}

async function captureJob(job: Job, prepared: Prepared) {
  let v: SkinViewer
  try {
    v = getIsoViewer()
  } catch (err) {
    job.reject(err)
    pumping = false
    if (queue.length) schedulePump()
    return
  }
  // Hidden viewer: draw on demand only. The RAF loop stays paused so Explore
  // doesn't run three render loops behind everyone's back.
  pauseViewerLoop(v)
  v.loadSkin(prepared.skin, { model: prepared.model })
  applyGroupFocus(v, prepared.group, prepared.covers, false, prepared.parts)
  crispSkinTexture(v)
  v.render()

  try {
    const fill = spanFill(prepared.coverSpan)
    const png = await bakeViewerCanvas(v, prepared.bakeFx, { ...prepared.fx, ...fill })
    const result: IsoThumbResult = reviveStored({ png, wash: prepared.wash })
    memCache.set(job.key, result)
    setStoredThumb(job.key, { png, wash: prepared.wash })
    job.resolve(result)
  } catch (err) {
    job.reject(err)
  } finally {
    pumping = false
    if (queue.length) {
      window.setTimeout(() => pump(), 0)
    }
  }
}

function pump() {
  if (pumping) return
  const job = takeNextJob()
  if (!job) return
  pumping = true
  const cached = memCache.get(job.key)
  if (cached) {
    job.resolve(cached)
    pumping = false
    pump()
    return
  }
  void job
    .prepare()
    .then((prepared) => {
      captureJob(job, prepared)
    })
    .catch((err) => {
      job.reject(err)
      pumping = false
      pump()
    })
}

export async function isoPieceThumb(
  piece: Piece,
  model: SkinModel = "classic",
  { priority = false, bakeFx = true }: { priority?: boolean; bakeFx?: boolean } = {},
): Promise<IsoThumbResult> {
  // v77: thumbs store a PNG Blob instead of a base64 data URL — the old data
  // URLs were decoded by the image loader on every tile mount and kept a
  // base64 copy in the JS heap. The key rides on a texture fingerprint so
  // overwritten pieces re-bake (see skinHash).
  const key = isoPieceCacheKey(model, bakeFx, piece)
  return runOnceInflight(memCache, inflight, key, async () => {
    const stored = await getStoredThumb<StoredThumb>(key)
    if (stored) {
      const result = reviveStored(stored)
      memCache.set(key, result)
      return result
    }
    return enqueue(
      key,
      async () => {
        const skin = await composePieceSkin(piece)
        const wash = washFromCanvas(skin)
        const normalized = ensureModel(skin, model)
        const painted = groupsFromAtlas(normalized)
        const { covers, group } = preparePreview([piece], painted)
        const effective = covers ?? FULL_GROUPS
        return {
          skin: normalized,
          wash,
          group,
          covers: effective,
          coverSpan: effective.length,
          parts: partsFromAtlas(normalized),
          model: viewerModelName(model),
          bakeFx,
          fx: PIECE_FX,
        }
      },
      priority,
    )
  })
}

export async function isoOutfitThumb(
  pieces: Piece[],
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model: SkinModel = "classic",
  { priority = false, bakeFx = true }: { priority?: boolean; bakeFx?: boolean } = {},
): Promise<IsoThumbResult> {
  const outfitKey = pieces
    .map((piece) => `${piece.id}~${skinHash(piece.skin)}`)
    .join("|") || "empty"
  // v70: the rim became an inner overlay tinting the render's lit edge.
  // v71: thinner rim highlight (4px, 0.45 alpha) for full-figure looks.
  // v72: thumbs store a PNG Blob instead of a base64 data URL (see piece v77).
  // The outfit key rides on per-piece texture fingerprints so an overwrite of
  // any stacked piece re-bakes the whole look.
  const key = `outfit:v72:${bakeFx ? "fx" : "raw"}:${bodyId}:${bodyHue}:${model}:${outfitKey}`
  return runOnceInflight(memCache, inflight, key, async () => {
    const stored = await getStoredThumb<StoredThumb>(key)
    if (stored) {
      const result = reviveStored(stored)
      memCache.set(key, result)
      return result
    }
    return enqueue(
      key,
      async () => {
        const skin = await composeSkin(pieces, bodyId, bodyHue, model)
        const wash = washFromCanvas(skin)
        return {
          skin,
          wash,
          group: "full" as const,
          covers: FULL_GROUPS,
          coverSpan: 1,
          model: viewerModelName(model),
          bakeFx,
          fx: OUTFIT_FX,
        }
      },
      priority,
    )
  })
}

export async function isoPieceUrl(piece: Piece, model: SkinModel = "classic"): Promise<string> {
  const res = await isoPieceThumb(piece, model)
  return res.url
}

export async function isoOutfitUrl(
  pieces: Piece[],
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model: SkinModel = "classic",
): Promise<string> {
  const res = await isoOutfitThumb(pieces, bodyId, bodyHue, model)
  return res.url
}

