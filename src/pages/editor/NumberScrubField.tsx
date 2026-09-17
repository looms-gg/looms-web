import React, { useEffect, useRef, useState } from "react"
import { HoverTip } from "../../components/ui/HoverTip"

export interface NumberScrubFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  format?: (v: number) => string
  parse?: (n: number) => number
  width?: string
  tip?: string
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v))

const snapToStep = (v: number, min: number, step: number) =>
  min + Math.round((v - min) / step) * step

export function NumberScrubField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format = (v) => String(v),
  parse = (n) => n,
  width = "w-14",
  tip = label,
}: NumberScrubFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const dragState = useRef<{ pointerId: number; startX: number; startValue: number } | null>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    }
  }, [editing])

  const commitDraft = () => {
    const parsed = Number.parseFloat(draft)
    if (Number.isFinite(parsed)) {
      onChange(clamp(snapToStep(parse(parsed), min, step), min, max))
    }
    setEditing(false)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    if (editing) return
    e.preventDefault()
    inputRef.current?.setPointerCapture(e.pointerId)
    dragState.current = { pointerId: e.pointerId, startX: e.clientX, startValue: value }
    setDraft(format(value))
    setEditing(true)
    inputRef.current?.focus()
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    const drag = dragState.current
    if (!drag || drag.pointerId !== e.pointerId) return
    setEditing(false)
    const rect = inputRef.current?.getBoundingClientRect()
    const span = rect && rect.width > 0 ? rect.width : 60
    const delta = ((e.clientX - drag.startX) / span) * (max - min)
    onChange(clamp(snapToStep(drag.startValue + delta, min, step), min, max))
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    if (dragState.current?.pointerId === e.pointerId) {
      dragState.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (editing) {
      if (e.key === "Enter") {
        e.preventDefault()
        commitDraft()
      } else if (e.key === "Escape") {
        setEditing(false)
      }
      return
    }
    if (e.key === "ArrowUp" || e.key === "ArrowRight") {
      e.preventDefault()
      onChange(clamp(snapToStep(value + step, min, step), min, max))
    } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
      e.preventDefault()
      onChange(clamp(snapToStep(value - step, min, step), min, max))
    } else if (e.key === "Enter") {
      e.preventDefault()
      setDraft(format(value))
      setEditing(true)
    }
  }

  const field = (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={editing ? draft : format(value)}
      onChange={(e) => {
        setDraft(e.target.value)
        if (!editing) setEditing(true)
      }}
      onFocus={() => {
        if (!editing) {
          setDraft(format(value))
          setEditing(true)
        }
      }}
      onBlur={() => {
        if (editing) commitDraft()
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`${width} h-7 shrink-0 cursor-ew-resize rounded-lg border border-base-content/15 bg-base-100/70 px-1.5 text-center font-mono text-xs font-bold text-base-content focus:cursor-text focus:bg-base-100 focus:outline-none`}
    />
  )

  if (!tip) return field
  return (
    <HoverTip tip={tip}>
      {field}
    </HoverTip>
  )
}
