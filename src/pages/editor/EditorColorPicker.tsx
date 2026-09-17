import { useCallback, useEffect, useRef, useState } from "react"
import { Swap } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { hexToHsv, hsvToHex, normalizeHex, PICKER_PRESETS, type Hsv } from "./tools/colorModel"

const HUE_TRACK = ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff", "#ff0000"]

type DragTarget = "box" | "hue" | null

export function EditorColorPicker({
  color,
  onChange,
  recentColors = [],
  swapColors,
  presets = PICKER_PRESETS,
}: {
  color: string
  onChange: (hex: string, source: "drag" | "commit") => void
  recentColors?: string[]
  swapColors?: () => void
  presets?: string[]
}) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(color))
  const [hexText, setHexText] = useState<string>(normalizeHex(color) ?? "#000000")
  // External color changes (eyedropper, presets elsewhere) re-sync the picker,
  // but the picker's own emits do not feed back through the prop.
  const lastSyncedRef = useRef<string>(normalizeHex(color)?.toLowerCase() ?? "#000000")
  const dragRef = useRef<DragTarget>(null)

  const boxRef = useRef<HTMLCanvasElement | null>(null)
  const hueRef = useRef<HTMLCanvasElement | null>(null)
  const boxWrapRef = useRef<HTMLDivElement | null>(null)
  const hueWrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const clean = normalizeHex(color)?.toLowerCase()
    if (clean && clean !== lastSyncedRef.current) {
      lastSyncedRef.current = clean
      setHexText(clean)
      setHsv(hexToHsv(clean))
    }
  }, [color])

  const emit = useCallback(
    (next: Hsv, source: "drag" | "commit" = "commit") => {
      setHsv(next)
      const hex = hsvToHex(next)
      setHexText(hex)
      lastSyncedRef.current = hex
      onChange(hex, source)
    },
    [onChange],
  )

  // Saturation/brightness field: white-to-hue horizontally, black vertically,
  // so every hue's full range is reachable in one box.
  useEffect(() => {
    const box = boxRef.current
    const ctx = box?.getContext("2d")
    if (!box || !ctx || typeof ctx.createLinearGradient !== "function") return
    const { width, height } = box
    ctx.clearRect(0, 0, width, height)
    const horiz = ctx.createLinearGradient(0, 0, width, 0)
    horiz.addColorStop(0, "#ffffff")
    horiz.addColorStop(1, hsvToHex({ h: hsv.h, s: 1, v: 1 }))
    ctx.fillStyle = horiz
    ctx.fillRect(0, 0, width, height)
    const vert = ctx.createLinearGradient(0, 0, 0, height)
    vert.addColorStop(0, "rgba(0,0,0,0)")
    vert.addColorStop(1, "rgba(0,0,0,1)")
    ctx.fillStyle = vert
    ctx.fillRect(0, 0, width, height)
  }, [hsv.h])

  useEffect(() => {
    const hue = hueRef.current
    const ctx = hue?.getContext("2d")
    if (!hue || !ctx || typeof ctx.createLinearGradient !== "function") return
    const { width, height } = hue
    const grad = ctx.createLinearGradient(0, 0, width, 0)
    HUE_TRACK.forEach((c, i) => {
      grad.addColorStop(i / (HUE_TRACK.length - 1), c)
    })
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  }, [])

  const applyDrag = useCallback(
    (target: Exclude<DragTarget, null>, clientX: number, clientY: number) => {
      const wrap = target === "box" ? boxWrapRef.current : hueWrapRef.current
      if (!wrap) return
      const rect = wrap.getBoundingClientRect()
      const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      if (target === "box") {
        const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
        emit({ h: hsv.h, s: x, v: 1 - y }, "drag")
        return
      }
      // Zero-saturation or zero-value colors keep their exact look no matter
      // the hue, so bump to a visible level before dragging resumes feedback.
      emit(
        {
          h: Math.round(x * 360) % 360,
          s: hsv.s === 0 ? 1 : hsv.s,
          v: hsv.v === 0 ? 1 : hsv.v,
        },
        "drag",
      )
    },
    [emit, hsv],
  )

  const onPointerDown = (target: Exclude<DragTarget, null>) => (
    e: React.PointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = target
    applyDrag(target, e.clientX, e.clientY)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    applyDrag(dragRef.current, e.clientX, e.clientY)
  }

  const onPointerUp = () => {
    dragRef.current = null
  }

  const commitHexText = () => {
    const clean = normalizeHex(hexText)
    if (clean) {
      setHexText(clean)
      emit(hexToHsv(clean))
    } else {
      setHexText(hsvToHex(hsv))
    }
  }

  const swatchBase =
    "h-6 w-6 shrink-0 rounded-md border transition-transform hover:scale-110 cursor-pointer"
  const swatchOn = (hex: string) =>
    normalizeHex(color)?.toLowerCase() === hex.toLowerCase()

  const huePuck = {
    left: `${((((hsv.h % 360) + 360) % 360) / 360) * 100}%`,
  }
  const boxPuck = {
    left: `${hsv.s * 100}%`,
    top: `${(1 - hsv.v) * 100}%`,
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      {/* Saturation / brightness field */}
      <div
        ref={boxWrapRef}
        role="slider"
        aria-label="Saturation and brightness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        tabIndex={0}
        onPointerDown={onPointerDown("box")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-28 w-full cursor-crosshair touch-none overflow-hidden rounded-md border border-base-content/15"
      >
        <canvas ref={boxRef} width={232} height={112} className="absolute inset-0 h-full w-full" />
        <div
          aria-hidden
          style={{ ...boxPuck, backgroundColor: hsvToHex(hsv) }}
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueWrapRef}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        onPointerDown={onPointerDown("hue")}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-3 w-full cursor-ew-resize touch-none overflow-hidden rounded-full border border-base-content/15"
      >
        <canvas ref={hueRef} width={200} height={12} className="absolute inset-0 h-full w-full" />
        <div
          aria-hidden
          style={huePuck}
          className="pointer-events-none absolute top-0 h-full w-2.5 -translate-x-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.5)]"
        />
      </div>

      {/* Hex entry */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 font-mono text-xs font-bold text-base-content/55">#</span>
        <input
          type="text"
          value={hexText.replace(/^#/, "")}
          onChange={(e) => setHexText(e.target.value)}
          onBlur={commitHexText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitHexText()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          aria-label="Hex color"
          className="font-mono h-7 w-full rounded-md border border-base-content/15 bg-base-300 px-2 text-xs text-base-content uppercase min-w-0 focus:outline-none"
          placeholder="000000"
        />
        {typeof swapColors === "function" ? (
          <button
            type="button"
            onClick={swapColors}
            aria-label="Swap primary and secondary colors"
            title="Swap colors (X)"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base-content/70 hover:bg-base-content/10 hover:text-base-content cursor-pointer"
          >
            <Icon icon={Swap} size="xs" />
          </button>
        ) : null}
      </div>

      {/* Recently used */}
      {recentColors.length > 0 ? (
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-base-content/55">
            Recently used
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {recentColors.slice(0, 6).map((c) => (
              <button
                key={`recent-${c}`}
                type="button"
                onClick={() => emit(hexToHsv(c))}
                title={c}
                style={{ backgroundColor: c }}
                aria-label={`Use recent color ${c}`}
                className={swatchBase}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Presets */}
      <div>
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-base-content/55">
          Palette
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {presets.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => emit(hexToHsv(hex))}
              title={hex}
              style={{ backgroundColor: hex }}
              aria-label={`Use preset color ${hex}`}
              className={`${swatchBase} ${
                swatchOn(hex)
                  ? "ring-2 ring-primary border-base-100"
                  : "border-base-content/15"
              }`}
          />
        ))}
        </div>
      </div>
    </div>
  )
}
