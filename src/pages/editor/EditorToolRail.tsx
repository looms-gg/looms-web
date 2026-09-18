import { memo } from "react"
import {
  ArrowsClockwise,
  ArrowsLeftRight,
  Circle,
  Rectangle,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import type { SkinEditorState } from "./useSkinEditor"
import { BucketFillDropdown } from "./BucketFillDropdown"
import type { BucketMode } from "./tools/editorTools"
import { EDITOR_TOOL_DEFS } from "./tools/editorToolDefs"

export const EditorToolRail = memo(function EditorToolRail({
  editor,
}: {
  editor: SkinEditorState
}) {
  const {
    tool,
    brushSize,
    shadingMode,
    bucketMode,
    shapeKind = "rectangle",
    shapeFill = "filled",
    symmetry,
  } = editor.brush.data
  const { patch } = editor.brush
  const {
    primaryColor,
    secondaryColor,
    recentColors,
  } = editor.colors.data
  const { setPrimaryColor, setSecondaryColor, swapColors } = editor.colors

  const currentToolLabel =
    EDITOR_TOOL_DEFS.find((t) => t.id === tool)?.label ?? "Pen"

  return (
    <aside className="editor-tools studio-wardrobe rounded-[18px] bg-base-200 p-4 flex flex-col gap-3.5 overflow-y-auto min-h-0 h-full">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-base-content/10">
        <h2 className="text-lg font-extrabold tracking-tight">Tools</h2>
        <span className="badge badge-neutral badge-sm font-bold opacity-75">
          {currentToolLabel}
        </span>
      </div>

      {/* Primary Tool Buttons - Chunky, tactile cards */}
      <div className="grid grid-cols-2 gap-2">
        {EDITOR_TOOL_DEFS.map((t) => {
          const active = tool === t.id
          return (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={`${t.label} (${t.shortcut})`}
              onClick={() => patch({ tool: t.id })}
              className={`btn h-14 min-h-14 flex-col gap-1 rounded-2xl border-0 p-2 font-extrabold transition-all cursor-pointer ${
                active
                  ? "btn-primary shadow-xs ring-2 ring-primary/40 scale-[1.02]"
                  : "btn-ghost bg-base-300/70 text-base-content/80 hover:bg-base-300 hover:text-base-content"
              }`}
            >
              <div className="flex items-center justify-between w-full px-1">
                <Icon icon={t.icon} size="md" />
                <kbd
                  className={`kbd kbd-xs text-[10px] font-mono font-extrabold ${
                    active
                      ? "bg-primary-content/20 text-primary-content"
                      : "bg-base-content/10 text-base-content/50"
                  }`}
                >
                  {t.shortcut}
                </kbd>
              </div>
              <span className="text-xs tracking-tight self-start px-1 truncate w-full text-left">
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tool Options Card */}
      <div className="rounded-[14px] bg-base-300/65 p-3.5 space-y-3 border border-base-content/8">
        {/* Brush Size */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
            Brush Size
          </span>
          <div
            className="flex items-center gap-1 rounded-full bg-base-200/80 p-0.5"
            role="group"
            aria-label="Brush size"
          >
            {[1, 2, 3].map((size) => (
              <button
                key={size}
                type="button"
                className={`btn btn-xs h-7 min-h-0 px-3 rounded-full font-extrabold border-0 transition-all ${
                  brushSize === size
                    ? "btn-primary shadow-xs"
                    : "btn-ghost text-base-content/70 hover:text-base-content"
                }`}
                onClick={() => patch({ brushSize: size })}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* Shading Mode (when shading active) */}
        {tool === "shading" && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
              Shading
            </span>
            <div className="flex items-center gap-1 rounded-full bg-base-200/80 p-0.5">
              <button
                type="button"
                className={`btn btn-xs h-7 min-h-0 px-3 rounded-full font-extrabold border-0 ${
                  shadingMode === "lighten"
                    ? "btn-primary shadow-xs"
                    : "btn-ghost text-base-content/70"
                }`}
                onClick={() => patch({ shadingMode: "lighten" })}
              >
                Lighten
              </button>
              <button
                type="button"
                className={`btn btn-xs h-7 min-h-0 px-3 rounded-full font-extrabold border-0 ${
                  shadingMode === "darken"
                    ? "btn-primary shadow-xs"
                    : "btn-ghost text-base-content/70"
                }`}
                onClick={() => patch({ shadingMode: "darken" })}
              >
                Darken
              </button>
            </div>
          </div>
        )}

        {/* Bucket Mode (when bucket active) */}
        {tool === "bucket" && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
              Bucket Fill
            </span>
            <BucketFillDropdown
              value={bucketMode}
              onChange={(m: BucketMode) => patch({ bucketMode: m })}
            />
          </div>
        )}

        {/* Shape Kind + Fill (when shape active) */}
        {tool === "shape" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
                Shape
              </span>
              <div
                className="flex items-center gap-1 rounded-full bg-base-200/80 p-0.5"
                role="group"
                aria-label="Shape Kind"
              >
                <button
                  type="button"
                  className={`btn btn-xs h-7 min-h-0 w-7 rounded-full border-0 p-0! transition-all ${
                    shapeKind === "rectangle"
                      ? "btn-primary shadow-xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                  onClick={() => patch({ shapeKind: "rectangle" })}
                  aria-label="Rectangle Shape"
                  aria-pressed={shapeKind === "rectangle"}
                >
                  <Icon icon={Rectangle} size="xs" />
                </button>
                <button
                  type="button"
                  className={`btn btn-xs h-7 min-h-0 w-7 rounded-full border-0 p-0! transition-all ${
                    shapeKind === "ellipse"
                      ? "btn-primary shadow-xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                  onClick={() => patch({ shapeKind: "ellipse" })}
                  aria-label="Ellipse Shape"
                  aria-pressed={shapeKind === "ellipse"}
                >
                  <Icon icon={Circle} size="xs" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
                Outline
              </span>
              <div
                className="flex items-center gap-1 rounded-full bg-base-200/80 p-0.5"
                role="group"
                aria-label="Shape Fill"
              >
                <button
                  type="button"
                  className={`btn btn-xs h-7 min-h-0 px-3 rounded-full font-extrabold border-0 transition-all ${
                    shapeFill === "filled"
                      ? "btn-primary shadow-xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                    onClick={() => patch({ shapeFill: "filled" })}
                    aria-label="Solid Fill"
                  aria-pressed={shapeFill === "filled"}
                >
                  Filled
                </button>
                <button
                  type="button"
                  className={`btn btn-xs h-7 min-h-0 px-3 rounded-full font-extrabold border-0 transition-all ${
                    shapeFill === "hollow"
                      ? "btn-primary shadow-xs"
                      : "btn-ghost text-base-content/70 hover:text-base-content"
                  }`}
                    onClick={() => patch({ shapeFill: "hollow" })}
                    aria-label="Hollow Outline"
                  aria-pressed={shapeFill === "hollow"}
                >
                  Hollow
                </button>
              </div>
            </div>
          </>
        )}

        {/* Symmetry Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon icon={ArrowsLeftRight} size="sm" className="text-base-content/60" />
            <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
              X-Mirror
            </span>
          </div>
          <button
            type="button"
            className={`btn btn-xs h-7 min-h-0 rounded-full font-extrabold px-3.5 border-0 transition-all ${
              symmetry
                ? "btn-primary shadow-xs"
                : "btn-ghost bg-base-200 text-base-content/70 hover:bg-base-200/60"
            }`}
            onClick={() => patch({ symmetry: !symmetry })}
            aria-pressed={symmetry}
          >
            {symmetry ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Color Palette Card */}
      <div className="rounded-[14px] bg-base-300/65 p-3.5 space-y-3 border border-base-content/8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-[0.06em] text-base-content/70">
            Color Palette
          </span>
          <button
            type="button"
            onClick={swapColors}
            title="Swap primary and secondary (X)"
            className="btn btn-ghost btn-xs rounded-full font-bold gap-1 text-base-content/70 hover:text-base-content"
          >
            <Icon icon={ArrowsClockwise} size="xs" />
            <span>Swap (X)</span>
          </button>
        </div>

        {/* Active Color Chips & Hex */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2 shrink-0">
            {/* Primary Swatch */}
            <label
              className="relative block size-11 cursor-pointer rounded-2xl border-2 border-base-100 shadow-sm ring-2 ring-primary transition-transform hover:scale-105"
              style={{ backgroundColor: primaryColor }}
              title="Primary Color (Click to pick)"
            >
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="sr-only"
              />
            </label>

            {/* Secondary Swatch */}
            <label
              className="relative block size-9 cursor-pointer rounded-xl border border-base-content/25 shadow-xs transition-transform hover:scale-105"
              style={{ backgroundColor: secondaryColor }}
              title="Secondary Color"
            >
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>

          {/* Hex Input */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={primaryColor}
              maxLength={7}
              onChange={(e) => {
                const val = e.target.value
                if (/^#[0-9a-f]{0,6}$/i.test(val)) {
                  if (val.length === 7) setPrimaryColor(val)
                }
              }}
              className="input input-sm h-9 w-full font-mono text-center font-bold tracking-wider rounded-xl bg-base-200 border-base-content/10 focus:outline-none"
              aria-label="Hex color value"
            />
          </div>
        </div>

        {/* Recent Colors Grid */}
        <div>
          <span className="text-[10px] font-bold text-base-content/50 uppercase tracking-wider block mb-1.5">
            Recent Colors
          </span>
          <div className="grid grid-cols-6 gap-1.5 rounded-xl bg-base-200/70 p-2">
            {recentColors.slice(0, 12).map((color, idx) => (
              <button
                key={`${color}-${idx}`}
                type="button"
                style={{ backgroundColor: color }}
                onClick={() => setPrimaryColor(color)}
                className="size-7 rounded-lg border border-base-content/15 shadow-2xs hover:scale-110 transition-transform cursor-pointer"
                title={`Select ${color}`}
              />
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
})
