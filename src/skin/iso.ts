import { SkinViewer } from "skinview3d"
import { DEFAULT_BODY_ID } from "../data/bodies"
import { preparePreview, type Group, type Piece } from "../data/catalog"
import { composePieceSkin, composeSkin, groupsFromAtlas } from "./compose"
import { applyGroupFocus, crispSkinTexture, lightSkinViewer, skinviewModel } from "./focus"
import { ensureModel, type SkinModel } from "./convert"
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
  outfit: Piece[]
  model: "slim" | "default"
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
const queue: Job[] = []
let pumping = false
let pumpQueued = false
let viewer: SkinViewer | null = null

const DB_NAME = "looms_iso_cache_v1"
const STORE_NAME = "thumbnails"
let dbPromise: Promise<IDBDatabase | null> | null = null

function getDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

async function getStoredThumb(key: string): Promise<IsoThumbResult | null> {
  const db = await getDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve((req.result as IsoThumbResult) || null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function setStoredThumb(key: string, data: IsoThumbResult) {
  void getDb().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      store.put(data, key)
    } catch {
      // ignore
    }
  })
}

function getIsoViewer() {
  if (viewer) return viewer
  const host = document.createElement("div")
  host.style.position = "fixed"
  host.style.left = "-9999px"
  host.style.top = "-9999px"
  host.style.width = "180px"
  host.style.height = "210px"
  host.style.visibility = "hidden"
  try {
    const next = new SkinViewer({
      canvas: document.createElement("canvas"),
      width: 180,
      height: 210,
    })
    host.appendChild(next.canvas)
    document.body.appendChild(host)
    lightSkinViewer(next)
    crispSkinTexture(next)
    viewer = next
    return next
  } catch (err) {
    host.remove()
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

function captureJob(job: Job, prepared: Prepared) {
  let v: SkinViewer
  try {
    v = getIsoViewer()
  } catch (err) {
    job.reject(err)
    pumping = false
    if (queue.length) schedulePump()
    return
  }
  v.loadSkin(prepared.skin, { model: prepared.model })
  applyGroupFocus(v, prepared.group, prepared.outfit, prepared.covers, false)
  crispSkinTexture(v)
  v.render()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try {
        v.render()
        const result: IsoThumbResult = {
          url: v.canvas.toDataURL("image/png"),
          wash: prepared.wash,
        }
        memCache.set(job.key, result)
        setStoredThumb(job.key, result)
        job.resolve(result)
      } catch (err) {
        job.reject(err)
      } finally {
        pumping = false
        if (queue.length) {
          window.setTimeout(() => pump(), 0)
        }
      }
    })
  })
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
  priority = false,
): Promise<IsoThumbResult> {
  const key = `piece:v57:${model}:${piece.id}`
  const mem = memCache.get(key)
  if (mem) return mem
  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async () => {
    const stored = await getStoredThumb(key)
    if (stored) {
      memCache.set(key, stored)
      return stored
    }
    return enqueue(
      key,
      async () => {
        const skin = await composePieceSkin(piece)
        const wash = washFromCanvas(skin)
        const normalized = ensureModel(skin, model)
        const { covers, group } = preparePreview([piece], groupsFromAtlas(normalized))
        return {
          skin: normalized,
          wash,
          group,
          covers: covers ?? ["head", "torso", "legs"],
          outfit: [piece],
          model: skinviewModel(model),
        }
      },
      priority,
    )
  })()
  inflight.set(key, work)
  void work
    .finally(() => {
      if (inflight.get(key) === work) inflight.delete(key)
    })
    .catch(() => {})
  return work
}

export async function isoOutfitThumb(
  pieces: Piece[],
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model: SkinModel = "classic",
  priority = false,
): Promise<IsoThumbResult> {
  const outfitKey = pieces.map((piece) => piece.id).join("|") || "empty"
  const key = `outfit:v57:${bodyId}:${bodyHue}:${model}:${outfitKey}`
  const mem = memCache.get(key)
  if (mem) return mem
  const pending = inflight.get(key)
  if (pending) return pending

  const work = (async () => {
    const stored = await getStoredThumb(key)
    if (stored) {
      memCache.set(key, stored)
      return stored
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
          covers: ["head", "torso", "legs"] satisfies Group[],
          outfit: pieces,
          model: skinviewModel(model),
        }
      },
      priority,
    )
  })()
  inflight.set(key, work)
  void work
    .finally(() => {
      if (inflight.get(key) === work) inflight.delete(key)
    })
    .catch(() => {})
  return work
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

