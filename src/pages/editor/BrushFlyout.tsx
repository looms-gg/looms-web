import React, { useRef, useState } from "react"
import { Icon } from "../../components/ui/Icon"
import { HoverTip } from "../../components/ui/HoverTip"
import type { EditorTool, SkinEditorState } from "./useSkinEditor"
import { EDITOR_TOOL_DEFS, type EditorToolDef } from "./tools/editorToolDefs"
import { useDismissable } from "../../components/shell/useDismissable"

const BRUSH_TOOL_IDS = new Set<EditorTool>([
  "pencil",
  "bucket",
  "shading",
  "eraser",
])

export const SymmetryIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 shrink-0"
    {...props}
  >
    <path d="M12 3v18" strokeDasharray="2.4 2.4" />
    <path d="M9 7L4 12l5 5z" fill="currentColor" stroke="none" />
    <path d="M15 7l5 5-5 5z" fill="currentColor" stroke="none" />
  </svg>
)

const BRUSH_TOOLS = EDITOR_TOOL_DEFS.filter((t): t is EditorToolDef =>
  BRUSH_TOOL_IDS.has(t.id)
)

export interface BrushFlyoutProps {
  editor: SkinEditorState
  className?: string
}

export function BrushFlyout({ editor, className = "" }: BrushFlyoutProps) {
  const [open, setOpen] = useState(false)
  const flyoutRef = useRef<HTMLDivElement | null>(null)

  const {
    tool,
    brushSize,
    shadingMode,
    symmetry,
  } = editor.brush.data
  const { patch } = editor.brush

  // Find active tool icon or default to pencil
  const activeToolDef = BRUSH_TOOLS.find((t) => t.id === tool) || BRUSH_TOOLS[0]

  useDismissable(open, flyoutRef, () => setOpen(false))

  return (
    <div className={`relative ${className}`} ref={flyoutRef}>
      {/* Trigger button on the toolbar rail */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Brush Tools"
        aria-expanded={open}
        title={`Drawing Tools (${activeToolDef.label})`}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors cursor-pointer ${
          open
            ? "bg-neutral-300 dark:bg-neutral-700 text-neutral-900 dark:text-white"
            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700/80"
        }`}
      >
        <Icon icon={activeToolDef.icon} size="sm" />
      </button>

      {/* Flyout Popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Brush Settings"
          className="absolute left-full top-0 ml-2 z-50 w-60 rounded-lg border border-neutral-300 bg-neutral-50 p-3 shadow-xl dark:border-neutral-700 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 select-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-700">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Brushes & Tools
            </span>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-4 gap-1 p-1 my-2 rounded-md bg-neutral-200/50 dark:bg-neutral-900/40">
            {BRUSH_TOOLS.map((t) => {
              const active = tool === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    patch({ tool: t.id })
                  }}
                  aria-label={`${t.label} (${t.shortcut})`}
                  title={`${t.label} (${t.shortcut})`}
                  className={`flex h-9 flex-col items-center justify-center rounded transition-all cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white shadow-xs font-semibold"
                      : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300/60 dark:hover:bg-neutral-700/60"
                  }`}
                >
                  <Icon icon={t.icon} size="xs" />
                  <span className="text-[10px] mt-0.5">{t.shortcut}</span>
                </button>
              )
            })}
          </div>

          {/* Shading Sub-Mode Toggle */}
          {tool === "shading" && (
            <div className="flex items-center justify-between gap-2 p-1.5 mb-2 rounded bg-neutral-100 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-700">
              <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                Mode:
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => patch({ shadingMode: "lighten" })}
                  className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                    shadingMode === "lighten"
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  Lighten (+)
                </button>
                <button
                  type="button"
                  onClick={() => patch({ shadingMode: "darken" })}
                  className={`px-2 py-0.5 text-xs font-bold rounded cursor-pointer ${
                    shadingMode === "darken"
                      ? "bg-blue-600 text-white"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                  }`}
                >
                  Darken (-)
                </button>
              </div>
            </div>
          )}

          {/* Brush Size / Radius */}
          <div className="my-2.5 flex flex-col gap-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-neutral-600 dark:text-neutral-300">
                Brush Size
              </span>
              <span className="font-mono text-neutral-500 dark:text-neutral-400">
                {brushSize}px
              </span>
            </div>
            <HoverTip tip="Brush Size">
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={brushSize}
                onChange={(e) => patch({ brushSize: Number(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none"
              />
            </HoverTip>
          </div>

          <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700 my-2" />

          {/* Symmetry Toggle */}
          <HoverTip tip="Symmetry (Mirror)">
            <button
              type="button"
              onClick={() => patch({ symmetry: !symmetry })}
              aria-label="Toggle Symmetry"
              className={`flex w-full items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                symmetry
                  ? "bg-blue-600 text-white"
                  : "bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              <div className="flex items-center gap-2">
                <SymmetryIcon />
                <span>Symmetry (Mirror)</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {symmetry ? "ON" : "OFF"}
              </span>
            </button>
          </HoverTip>
        </div>
      )}
    </div>
  )
}

