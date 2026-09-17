import { Square, Circle, Rectangle } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import type { SkinEditorState } from "./useSkinEditor"
import { SymmetryIcon } from "./BrushFlyout"
import type { BrushBlendMode, BucketMode } from "./tools/editorTools"
import { NumberScrubField } from "./NumberScrubField"
import { BucketFillDropdown } from "./BucketFillDropdown"
import { HoverTip } from "../../components/ui/HoverTip"
import { Dropdown } from "../../components/ui/Dropdown"

const TOOL_LABELS: Record<string, string> = {
  pencil: "Pen",
  eraser: "Eraser",
  bucket: "Bucket",
  shading: "Shading",
  noise: "Noise",
  shape: "Shape",
  picker: "Eyedropper",
}

// Tools whose stroke honors brushSize / shape / opacity / softness
const SIZE_TOOLS = new Set(["pencil", "eraser", "shading", "noise"])

// Blend modes only make sense when painting color onto existing pixels
const BLEND_TOOLS = new Set(["pencil", "noise", "bucket", "shape"])

const BLEND_MODES: { id: BrushBlendMode; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "multiply", label: "Multiply" },
  { id: "screen", label: "Screen" },
  { id: "lighten", label: "Lighten" },
  { id: "darken", label: "Darken" },
  { id: "overlay", label: "Overlay" },
]

const OptionsDivider = () => (
  <div className="mx-1 h-6 w-px shrink-0 bg-base-content/15" />
)

export interface EditorOptionsBarProps {
  editor: SkinEditorState
  className?: string
}

export function EditorOptionsBar({ editor, className = "" }: EditorOptionsBarProps) {
  const {
    tool,
    brushSize = 1,
    brushShape = "square",
    brushOpacity = 1,
    brushSoftness = 0,
    brushBlend = "normal",
    shadingMode = "lighten",
    bucketMode = "connectedColors",
    shapeKind = "rectangle",
    shapeFill = "filled",
    symmetry = false,
  } = editor.brush.data
  const { patch } = editor.brush
  const { model = "classic", setModel } = editor

  const isSizeTool = SIZE_TOOLS.has(tool)
  const isBlendTool = BLEND_TOOLS.has(tool)

  return (
    <div
      role="toolbar"
      aria-label="Tool Options"
      className={`pointer-events-auto hidden h-12 shrink-0 select-none items-center gap-1.5 border-b border-base-content/10 px-3 md:flex z-30 ${className}`}
    >
      {/* Selected tool name */}
      <span
        aria-label="Selected Tool"
        className="shrink-0 rounded-md bg-base-300 px-2 py-1 text-xs font-bold text-base-content"
      >
        {TOOL_LABELS[tool] ?? "Tool"}
      </span>

      <OptionsDivider />

      {/* Arm model: visible at all times; switching repairs arm pixels (4px ↔ 3px) */}
      <div
        role="group"
        aria-label="Arm model"
        className="flex shrink-0 items-center gap-0.5 rounded-md bg-base-300/70 p-0.5"
      >
        <button
          type="button"
          onClick={() => setModel?.("classic")}
          aria-pressed={model === "classic"}
          aria-label="Classic arms (4 pixels wide)"
          className={`px-2.5 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
            model === "classic"
              ? "bg-primary text-primary-content shadow-xs"
              : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
          }`}
        >
          Classic
        </button>
        <button
          type="button"
          onClick={() => setModel?.("slim")}
          aria-pressed={model === "slim"}
          aria-label="Slim arms (3 pixels wide)"
          className={`px-2.5 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
            model === "slim"
              ? "bg-primary text-primary-content shadow-xs"
              : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
          }`}
        >
          Slim
        </button>
      </div>

      {/* Shading Sub-Mode (when shading active) */}
      {tool === "shading" && (
        <div
          role="group"
          aria-label="Shading Mode"
          className="flex shrink-0 items-center gap-1 bg-base-300/70 p-0.5 rounded-md"
        >
          <HoverTip tip="Shading: Lighten">
            <button
              type="button"
              onClick={() => patch({ shadingMode: "lighten" })}
              aria-label="Shading Lighten (+)"
              className={`px-2 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                shadingMode === "lighten"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
              }`}
            >
              Lighten (+)
            </button>
          </HoverTip>
          <HoverTip tip="Shading: Darken">
            <button
              type="button"
              onClick={() => patch({ shadingMode: "darken" })}
              aria-label="Shading Darken (-)"
              className={`px-2 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                shadingMode === "darken"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
              }`}
            >
              Darken (-)
            </button>
          </HoverTip>
        </div>
      )}

      {/* Bucket Fill Mode (when bucket active) */}
      {tool === "bucket" && (
        <BucketFillDropdown
          value={bucketMode}
          onChange={(m: BucketMode) => patch({ bucketMode: m })}
        />
      )}

      {/* Brush Size + Softness (stroke tools only; shapes show size for the hollow outline) */}
      {(isSizeTool || tool === "shape") && (
        <>
          <NumberScrubField
            label="Brush Size"
            value={brushSize}
            min={1}
            max={8}
            step={1}
            onChange={(v) => patch({ brushSize: v })}
            format={(v) => `${Math.round(v)}px`}
            width="w-16"
          />
          {isSizeTool && (
            <NumberScrubField
              label="Softness"
              value={brushSoftness}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patch({ brushSoftness: v })}
              format={(v) => `${Math.round(v * 100)}%`}
              parse={(n) => n / 100}
            />
          )}
        </>
      )}

      {/* Opacity (stroke tools, bucket, and shapes) */}
      {(isSizeTool || tool === "bucket" || tool === "shape") && (
        <NumberScrubField
          label="Opacity"
          value={brushOpacity}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => patch({ brushOpacity: v })}
          format={(v) => `${Math.round(v * 100)}%`}
          parse={(n) => n / 100}
        />
      )}

      {/* Brush Shape (stroke tools only) */}
      {isSizeTool && (
        <div
          role="group"
          aria-label="Brush Shape"
          className="flex shrink-0 items-center gap-0.5 bg-base-300/70 p-0.5 rounded-md"
        >
          <HoverTip tip="Brush Shape: Square">
            <button
              type="button"
              onClick={() => patch({ brushShape: "square" })}
              aria-label="Square Brush"
              aria-pressed={brushShape === "square"}
              className={`flex h-6 w-6 items-center justify-center rounded-full cursor-pointer transition-colors ${
                brushShape === "square"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
              }`}
            >
              <Icon icon={Square} size="xs" />
            </button>
          </HoverTip>
          <HoverTip tip="Brush Shape: Round">
            <button
              type="button"
              onClick={() => patch({ brushShape: "circle" })}
              aria-label="Round Brush"
              aria-pressed={brushShape === "circle"}
              className={`flex h-6 w-6 items-center justify-center rounded-full cursor-pointer transition-colors ${
                brushShape === "circle"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
              }`}
            >
              <Icon icon={Circle} size="xs" />
            </button>
          </HoverTip>
        </div>
      )}

      {/* Shape Kind + Fill (when shape active) */}
      {tool === "shape" && (
        <>
          <div
            role="group"
            aria-label="Shape Kind"
            className="flex shrink-0 items-center gap-0.5 bg-base-300/70 p-0.5 rounded-md"
          >
            <HoverTip tip="Shape: Rectangle">
              <button
                type="button"
                onClick={() => patch({ shapeKind: "rectangle" })}
                aria-label="Rectangle Shape"
                aria-pressed={shapeKind === "rectangle"}
                className={`flex h-6 w-6 items-center justify-center rounded-full cursor-pointer transition-colors ${
                  shapeKind === "rectangle"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
                }`}
              >
                <Icon icon={Rectangle} size="xs" />
              </button>
            </HoverTip>
            <HoverTip tip="Shape: Ellipse">
              <button
                type="button"
                onClick={() => patch({ shapeKind: "ellipse" })}
                aria-label="Ellipse Shape"
                aria-pressed={shapeKind === "ellipse"}
                className={`flex h-6 w-6 items-center justify-center rounded-full cursor-pointer transition-colors ${
                  shapeKind === "ellipse"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
                }`}
              >
                <Icon icon={Circle} size="xs" />
              </button>
            </HoverTip>
          </div>

          <div
            role="group"
            aria-label="Shape Fill"
            className="flex shrink-0 items-center gap-1 bg-base-300/70 p-0.5 rounded-md"
          >
            <HoverTip tip="Shape: Solid Fill">
              <button
                type="button"
                onClick={() => patch({ shapeFill: "filled" })}
                aria-label="Solid Fill"
                aria-pressed={shapeFill === "filled"}
                className={`px-2 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                  shapeFill === "filled"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
                }`}
              >
                Filled
              </button>
            </HoverTip>
            <HoverTip tip="Shape: Hollow Outline (Brush Size sets line width)">
              <button
                type="button"
                onClick={() => patch({ shapeFill: "hollow" })}
                aria-label="Hollow Outline"
                aria-pressed={shapeFill === "hollow"}
                className={`px-2 py-0.5 text-xs font-bold rounded-full cursor-pointer transition-colors ${
                  shapeFill === "hollow"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
                }`}
              >
                Hollow
              </button>
            </HoverTip>
          </div>
        </>
      )}

      {/* Softness/Opacity handled by scrub fields above */}

      {/* Blend Mode (color painting tools only) */}
      {isBlendTool && (
        <>
          <span className="shrink-0 text-xs font-semibold text-base-content/70">
            Blend:
          </span>
          <Dropdown
            ariaLabel="Blend Mode"
            size="sm"
            align="right"
            className="shrink-0"
            value={brushBlend}
            onChange={(value) => patch({ brushBlend: value as BrushBlendMode })}
            options={BLEND_MODES.map((mode) => ({
              id: mode.id,
              label: mode.label,
            }))}
          />
        </>
      )}

      {/* Contextual hint (eyedropper has no tunable options) */}
      {tool === "picker" && (
        <span className="text-xs text-base-content/55">
          Click the model to sample a color
        </span>
      )}

      <div className="flex-1" />

      {/* Symmetry Toggle (applies to every painting tool) */}
      {tool !== "picker" && (
        <HoverTip tip="Symmetry (Mirror)">
          <button
            type="button"
            onClick={() => patch({ symmetry: !symmetry })}
            aria-label="Toggle Symmetry"
            aria-pressed={symmetry}
            className={`flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 transition-colors cursor-pointer ${
              symmetry
                ? "bg-primary text-primary-content shadow-xs font-bold"
                : "text-base-content/70 hover:bg-base-content/10 hover:text-base-content"
            }`}
          >
            <SymmetryIcon />
            <span className="text-xs font-bold">{symmetry ? "On" : "Off"}</span>
          </button>
        </HoverTip>
      )}
    </div>
  )
}

// Re-export for consumers that want to type against these
export type { BrushShape, BrushBlendMode } from "./tools/editorTools"
