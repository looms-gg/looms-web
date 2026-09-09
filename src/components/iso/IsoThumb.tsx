import { useEffect, useRef, useState, type CSSProperties } from "react"
import { DEFAULT_BODY_ID } from "../../data/bodies"
import type { Piece } from "../../data/catalog"
import type { SkinModel } from "../../skin/convert"

// Loaded on demand: skin/iso pulls in three.js + skinview3d (~large async
// chunk). Static pre-rendered thumbs never need it at all. The shadow+rim
// signature fx are baked into the thumb PNG itself (skin/thumbFx), so each
// tile paints one image with no per-tile CSS filters. Chips skip the bake —
// the old markup also rendered chips without the fx layers.

export type IsoThumbProps =
  | (IsoThumbShared & {
      piece: Piece
      outfit?: never
      bodyId?: never
      bodyHue?: never
    })
  | (IsoThumbShared & {
      outfit: Piece[]
      piece?: never
      bodyId?: string
      bodyHue?: number
    })

type IsoThumbShared = {
  alt: string
  chip?: boolean
  priority?: boolean
  className?: string
  model?: SkinModel
}

const SCROLL_ROOT_SELECTOR =
  '[data-scroll-root], .studio-wardrobe-list, .overflow-y-auto, .overflow-y-scroll, .overflow-x-auto, .overflow-x-scroll, .overflow-auto, .overflow-scroll'

function nearestScrollRoot(el: Element): Element | null {
  return el.closest(SCROLL_ROOT_SELECTOR)
}

type IntersectCallback = () => void

const callbacks = new WeakMap<Element, IntersectCallback>()

interface PooledObserver {
  observer: IntersectionObserver
  count: number
}

const viewportObservers = new Map<string, PooledObserver>()
const elementObservers = new WeakMap<Element, Map<string, PooledObserver>>()

function handleIntersect(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const cb = callbacks.get(entry.target)
      if (cb) {
        callbacks.delete(entry.target)
        cb()
      }
    }
  }
}

function getPooledObserver(root: Element | null, rootMargin: string): PooledObserver {
  if (!root) {
    let pooled = viewportObservers.get(rootMargin)
    if (!pooled || !(pooled.observer instanceof window.IntersectionObserver)) {
      if (pooled) pooled.observer.disconnect()
      const observer = new window.IntersectionObserver(handleIntersect, { root: null, rootMargin })
      pooled = { observer, count: 0 }
      viewportObservers.set(rootMargin, pooled)
    }
    return pooled
  }

  let map = elementObservers.get(root)
  if (!map) {
    map = new Map()
    elementObservers.set(root, map)
  }
  let pooled = map.get(rootMargin)
  if (!pooled || !(pooled.observer instanceof window.IntersectionObserver)) {
    if (pooled) pooled.observer.disconnect()
    const observer = new window.IntersectionObserver(handleIntersect, { root, rootMargin })
    pooled = { observer, count: 0 }
    map.set(rootMargin, pooled)
  }
  return pooled
}

function releasePooledObserver(root: Element | null, rootMargin: string) {
  if (!root) {
    const pooled = viewportObservers.get(rootMargin)
    if (pooled) {
      pooled.count--
      if (pooled.count <= 0) {
        pooled.observer.disconnect()
        viewportObservers.delete(rootMargin)
      }
    }
    return
  }

  const map = elementObservers.get(root)
  if (map) {
    const pooled = map.get(rootMargin)
    if (pooled) {
      pooled.count--
      if (pooled.count <= 0) {
        pooled.observer.disconnect()
        map.delete(rootMargin)
      }
    }
  }
}

export function IsoThumb({
  piece,
  outfit,
  bodyId = DEFAULT_BODY_ID,
  bodyHue = 0,
  model = "classic",
  alt,
  chip = false,
  priority = false,
  className = "",
}: IsoThumbProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const outfitRef = useRef(outfit)
  outfitRef.current = outfit
  const [src, setSrc] = useState<string>()
  const [wash, setWash] = useState<string>()
  const [inView, setInView] = useState(priority)
  const outfitKey = outfit?.map((item) => item.id).join("|") ?? ""

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    if (priority) {
      setInView(true)
      return
    }
    const el = frameRef.current
    if (!el) return

    const root = nearestScrollRoot(el)
    const rootMargin = chip ? "80px" : "120px"
    const pooled = getPooledObserver(root, rootMargin)
    pooled.count++

    let active = true
    const unobserve = () => {
      if (!active) return
      active = false
      callbacks.delete(el)
      pooled.observer.unobserve(el)
      releasePooledObserver(root, rootMargin)
    }

    callbacks.set(el, () => {
      setInView(true)
      unobserve()
    })
    pooled.observer.observe(el)

    return unobserve
  }, [chip, priority])

  useEffect(() => {
    if (!inView) return
    // An outfit whose stack has layers but resolves to zero pieces means its
    // pieces haven't surfaced in the catalog registry yet (look/catalog
    // hydration race). Hold the skeleton — when pieces resolve, outfitKey
    // changes and this refires. A truly empty look keeps the mannequin.
    if (!piece && (outfitRef.current ?? []).length === 0 && outfitKey !== "") return
    let alive = true
    const apply = (res: { url: string; wash: string } | null) => {
      if (!alive) return
      setSrc(res?.url)
      setWash(!chip && res ? res.wash : undefined)
    }
    void import("../../skin/iso")
      .then(({ isoOutfitThumb, isoPieceThumb }) =>
        piece
          ? isoPieceThumb(piece, model, priority, !chip)
          : isoOutfitThumb(outfitRef.current ?? [], bodyId, bodyHue, model, priority, !chip),
      )
      .then(apply)
      .catch(() => apply(null))
    return () => {
      alive = false
    }
  }, [bodyHue, bodyId, chip, inView, model, outfitKey, piece, priority])

  const fill = src ? { backgroundImage: `url("${src}")` } : undefined
  const frameWash = wash ? ({ "--iso-wash": wash } as CSSProperties) : undefined

  return (
    <div
      ref={frameRef}
      className={`iso-frame ${chip ? "iso-frame--chip" : ""} ${className}`}
      style={frameWash}
    >
      <div className="iso-thumb">
        <div
          role="img"
          aria-label={alt}
          className={`iso-thumb-fill iso-thumb-figure ${src ? "thumb-in" : ""}`}
          style={fill}
        />
        {src ? null : <div className="skin-bone" aria-hidden />}
      </div>
    </div>
  )
}
