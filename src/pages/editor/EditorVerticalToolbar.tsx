import {
  ArrowArcLeft,
  ArrowArcRight,
  ArrowsClockwise,
  ArrowsLeftRight,
  Circle,
  GridFour,
  Rectangle,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import type { SkinEditorState } from "./useSkinEditor"
import { BucketFillDropdown } from "./BucketFillDropdown"
import type { BucketMode } from "./tools/editorTools"
import { EDITOR_TOOL_DEFS } from "./tools/editorToolDefs"

export function EditorVerticalToolbar({
  editor,
  className = "",
}: {
  editor: SkinEditorState
  className?: string
}) {
  const {
    tool,
    brushSize,
    shadingMode,
    bucketMode,
    shapeKind = "rectangle",
    shapeFill = "filled",
    symmetry,
    gridVisible,
  } = editor.brush.data
  const { patch } = editor.brush
  const {
    primaryColor,
    secondaryColor,
  } = editor.colors.data
  const { setPrimaryColor, setSecondaryColor, swapColors } = editor.colors
  const {
    undo,
    redo,
    canUndo,
    canRedo,
  } = editor

  return (
    <div
      className={`select-none flex flex-col items-center gap-1.5 rounded-2xl bg-base-200/90 p-2 backdrop-blur-md border border-base-content/10 shadow-xl ${className}`}
      role="toolbar"
      aria-label="Editor Tools"
    >
      {/* Tool Buttons */}
      <div className="flex flex-col items-center gap-1">
        {EDITOR_TOOL_DEFS.map((t) => {
          const active = tool === t.id
          return (
            <button
              key={t.id}
              type="button"
              aria-label={t.label}
              title={`${t.label} (${t.shortcut})`}
              onClick={() => patch({ tool: t.id })}
              className={`btn btn-sm btn-circle size-9.5 min-h-9.5 border-0 transition-all cursor-pointer ${
                active
                  ? "btn-primary shadow-xs ring-2 ring-primary/40 scale-105"
                  : "btn-ghost text-base-content/75 hover:bg-base-300 hover:text-base-content"
              }`}
            >
              <Icon icon={t.icon} size="sm" />
            </button>
          )
        })}
      </div>

      {/* Shading Sub-Mode Toggle */}
      {tool === "shading" && (
        <div
          className="flex flex-col items-center gap-1 rounded-lg bg-base-300/80 p-0.5 border border-base-content/10"
          title="Shading Mode"
        >
          <button
            type="button"
            className={`btn btn-xs size-6 min-h-0 rounded-md border-0 p-0 font-extrabold text-[10px] ${
              shadingMode === "lighten"
                ? "btn-primary"
                : "btn-ghost text-base-content/70 hover:text-base-content"
            }`}
            onClick={() => patch({ shadingMode: "lighten" })}
            title="Lighten (+)"
          >
            +
          </button>
          <button
            type="button"
            className={`btn btn-xs size-6 min-h-0 rounded-md border-0 p-0 font-extrabold text-[10px] ${
              shadingMode === "darken"
                ? "btn-primary"
                : "btn-ghost text-base-content/70 hover:text-base-content"
            }`}
            onClick={() => patch({ shadingMode: "darken" })}
            title="Darken (-)"
          >
            -
          </button>
        </div>
      )}

      {/* Bucket Fill Mode */}
      {tool === "bucket" && (
        <div title="Bucket Fill Mode">
          <BucketFillDropdown
            value={bucketMode}
            onChange={(m: BucketMode) => patch({ bucketMode: m })}
            placement="right"
          />
        </div>
      )}

      {/* Shape Kind + Fill Toggles */}
      {tool === "shape" && (
        <div className="flex flex-col items-center gap-1 rounded-xl bg-base-300/80 p-0.5 border border-base-content/10">
          <div
            className="flex flex-col items-center gap-0.5"
            role="group"
            aria-label="Shape Kind"
            title="Shape Kind"
          >
            <button
              type="button"
              className={`btn btn-xs size-6 min-h-0 rounded-md border-0 p-0 transition-all cursor-pointer ${
                shapeKind === "rectangle"
                  ? "btn-primary"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
              onClick={() => patch({ shapeKind: "rectangle" })}
              aria-label="Rectangle Shape"
              aria-pressed={shapeKind === "rectangle"}
              title="Rectangle"
            >
              <Icon icon={Rectangle} size="xs" />
            </button>
            <button
              type="button"
              className={`btn btn-xs size-6 min-h-0 rounded-md border-0 p-0 transition-all cursor-pointer ${
                shapeKind === "ellipse"
                  ? "btn-primary"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
              onClick={() => patch({ shapeKind: "ellipse" })}
              aria-label="Ellipse Shape"
              aria-pressed={shapeKind === "ellipse"}
              title="Ellipse"
            >
              <Icon icon={Circle} size="xs" />
            </button>
          </div>
          <div
            className="flex flex-col items-center gap-0.5"
            role="group"
            aria-label="Shape Fill"
            title="Shape Fill"
          >
            <button
              type="button"
              className={`btn btn-xs h-6 min-h-0 px-1.5 rounded-md border-0 p-0 font-extrabold text-[10px] transition-all cursor-pointer ${
                shapeFill === "filled"
                  ? "btn-primary"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
              onClick={() => patch({ shapeFill: "filled" })}
              aria-label="Solid Fill"
              aria-pressed={shapeFill === "filled"}
              title="Filled"
            >
              Fill
            </button>
            <button
              type="button"
              className={`btn btn-xs h-6 min-h-0 px-1.5 rounded-md border-0 p-0 font-extrabold text-[10px] transition-all cursor-pointer ${
                shapeFill === "hollow"
                  ? "btn-primary"
                  : "btn-ghost text-base-content/70 hover:text-base-content"
              }`}
              onClick={() => patch({ shapeFill: "hollow" })}
              aria-label="Hollow Outline"
              aria-pressed={shapeFill === "hollow"}
              title="Hollow (line width = brush size)"
            >
              Hollow
            </button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="h-px w-6 bg-base-content/15 my-0.5" />

      {/* Color Swatches Stack */}
      <div className="relative flex flex-col items-center gap-1">
        {/* Primary Color Swatch */}
        <label
          className="relative block size-7.5 cursor-pointer rounded-xl border-2 border-base-100 shadow-xs ring-2 ring-primary transition-transform hover:scale-110"
          style={{ backgroundColor: primaryColor }}
          title="Primary Color (Click to change)"
        >
          <input
            type="color"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            className="sr-only"
          />
        </label>

        {/* Secondary Color Swatch & Swap Button */}
        <div className="flex items-center gap-1">
          <label
            className="relative block size-5.5 cursor-pointer rounded-lg border border-base-content/25 shadow-2xs transition-transform hover:scale-110"
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
          <button
            type="button"
            onClick={swapColors}
            title="Swap Colors (X)"
            className="btn btn-ghost btn-circle size-5 min-h-5 p-0 text-base-content/60 hover:text-base-content"
          >
            <Icon icon={ArrowsClockwise} size="xs" />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-6 bg-base-content/15 my-0.5" />

      {/* Brush Size Selector */}
      <div
        className="flex flex-col items-center gap-0.5 rounded-xl bg-base-300/80 p-0.5 border border-base-content/10"
        role="group"
        aria-label="Brush size"
        title="Brush Size"
      >
        {[1, 2, 3].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => patch({ brushSize: size })}
            title={`${size}px Brush`}
            className={`btn btn-xs size-6 min-h-0 rounded-lg border-0 p-0 font-extrabold text-[10px] transition-all cursor-pointer ${
              brushSize === size
                ? "btn-primary shadow-2xs"
                : "btn-ghost text-base-content/70 hover:text-base-content"
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px w-6 bg-base-content/15 my-0.5" />

      {/* Symmetry & Grid Toggles */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => patch({ symmetry: !symmetry })}
          aria-pressed={symmetry}
          title={`Symmetry Mirror: ${symmetry ? "On" : "Off"}`}
          className={`btn btn-sm btn-circle size-8 min-h-8 border-0 transition-all cursor-pointer ${
            symmetry
              ? "btn-primary shadow-xs"
              : "btn-ghost text-base-content/70 hover:bg-base-300 hover:text-base-content"
          }`}
        >
          <Icon icon={ArrowsLeftRight} size="xs" />
        </button>

        <button
          type="button"
          onClick={() => patch({ gridVisible: !gridVisible })}
          aria-pressed={gridVisible}
          title={`Pixel Grid: ${gridVisible ? "On" : "Off"}`}
          className={`btn btn-sm btn-circle size-8 min-h-8 border-0 transition-all cursor-pointer ${
            gridVisible
              ? "btn-primary shadow-xs"
              : "btn-ghost text-base-content/70 hover:bg-base-300 hover:text-base-content"
          }`}
        >
          <Icon icon={GridFour} size="xs" />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px w-6 bg-base-content/15 my-0.5" />

      {/* Undo / Redo */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className="btn btn-ghost btn-circle size-8 min-h-8 text-base-content/70 hover:text-base-content disabled:opacity-25 cursor-pointer"
        >
          <Icon icon={ArrowArcLeft} size="xs" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
          className="btn btn-ghost btn-circle size-8 min-h-8 text-base-content/70 hover:text-base-content disabled:opacity-25 cursor-pointer"
        >
          <Icon icon={ArrowArcRight} size="xs" />
        </button>
      </div>
    </div>
  )
}

