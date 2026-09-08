import { useEffect, useRef, useState, type CSSProperties } from "react"
import { DEFAULT_BODY_ID } from "../../data/bodies"
import type { Piece } from "../../data/catalog"
import { isoOutfitThumb, isoPieceThumb } from "../../skin/iso"
import type { SkinModel } from "../../skin/convert"

const RIM_DIRS = ["ne", "e", "se"] as const

type IsoThumbShared = {
  alt: string
  chip?: boolean
  priority?: boolean
  className?: string
  model?: SkinModel
}

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

function nearestScrollRoot(el: Element) {
  let node = el.parentElement
  while (node && node !== document.documentElement) {
    const style = getComputedStyle(node)
    const y = style.overflowY
    const x = style.overflowX
    if (y === "auto" || y === "scroll" || x === "auto" || x === "scroll") {
      return node
    }
    node = node.parentElement
  }
  return null
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
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            observer.disconnect()
            break
          }
        }
      },
      {
        root: nearestScrollRoot(el),
        rootMargin: chip ? "80px" : "120px",
      },
    )
    observer.observe(el)
    return () => {
      observer.disconnect()
    }
  }, [chip, priority])

  useEffect(() => {
    if (!inView) return
    let alive = true
    const job = piece
      ? isoPieceThumb(piece, model, priority)
      : isoOutfitThumb(outfitRef.current ?? [], bodyId, bodyHue, model, priority)
    job
      .then((res) => {
        if (alive) {
          setSrc(res.url)
          if (!chip) setWash(res.wash)
        }
      })
      .catch(() => {
        if (alive) {
          setSrc(undefined)
          setWash(undefined)
        }
      })
    return () => {
      alive = false
    }
  }, [bodyHue, bodyId, chip, inView, model, outfitKey, piece, priority])

  const fill = src ? { backgroundImage: `url("${src}")` } : undefined
  const punch = Boolean(src) && !chip
  const frameWash = wash ? ({ "--iso-wash": wash } as CSSProperties) : undefined

  return (
    <div
      ref={frameRef}
      className={`iso-frame ${chip ? "iso-frame--chip" : ""} ${className}`}
      style={frameWash}
    >
      <div className="iso-thumb">
        {punch ? (
          <>
            <div className="iso-thumb-fill iso-thumb-shadow" style={fill} aria-hidden />
            <div className="iso-thumb-rim" aria-hidden>
              {RIM_DIRS.map((dir) => (
                <div
                  key={dir}
                  className="iso-thumb-fill iso-thumb-rim-copy"
                  data-rim={dir}
                  style={fill}
                />
              ))}
            </div>
          </>
        ) : null}
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
