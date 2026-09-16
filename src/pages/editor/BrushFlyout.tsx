// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: the MineSkin original was a 1000-line radix
// popover with the same tool set. Tools: pixel, bulk (radius + shape),
// variation (intensity), dither, eraser (radius), plus symmetry toggle.
import { useRendererStore } from "../../editor/store";
import { MAX_VARIATION_STEPS, cn } from "../../editor/core/utils";
import Dropdown, { DropdownItem, DropdownLabel } from "./controls/Dropdown";
import ToolButton from "./ToolButton";
import { Icon, type IconType } from "../../components/ui/Icon";
import {
  ArrowsLeftRight,
  Cursor,
  Eraser,
  PencilCircle,
  PencilRuler,
  PaintBrush,
} from "@phosphor-icons/react";

export interface BrushFlyoutProps {
  side?: "top" | "bottom";
  tooltipSide?: "left" | "right";
}

const TOOLS: {
  mode: "pixel" | "bulk" | "variation" | "dither" | "eraser";
  label: string;
  icon: IconType;
}[] = [
  { mode: "pixel", label: "Pixel brush", icon: PencilRuler },
  { mode: "bulk", label: "Area brush", icon: PaintBrush },
  { mode: "variation", label: "Shade brush", icon: PencilCircle },
  { mode: "dither", label: "Dither brush", icon: Cursor },
  { mode: "eraser", label: "Eraser", icon: Eraser },
];

export default function BrushFlyout({}: BrushFlyoutProps) {
  const paintMode = useRendererStore((s) => s.paintMode);
  const bulkPaintRadius = useRendererStore((s) => s.bulkPaintRadius);
  const bulkPaintShape = useRendererStore((s) => s.bulkPaintShape);
  const eraserRadius = useRendererStore((s) => s.eraserRadius);
  const variationIntensity = useRendererStore((s) => s.variationIntensity);
  const mirrorPaint = useRendererStore((s) => s.mirrorPaint);
  const setValue = useRendererStore((s) => s.setValue);

  const activeTool = paintMode === "dither" ? "dither" : paintMode;
  const activeEntry = TOOLS.find((tool) => tool.mode === activeTool);
  const ActiveIcon = activeEntry?.icon ?? PencilRuler;

  const selectTool = (mode: (typeof TOOLS)[number]["mode"]) => {
    setValue("paintMode", mode === "dither" ? "dither" : mode);
  };

  const trigger = (
    <ToolButton
      label="Brushes"
      active={paintMode !== "pixel"}
      grouped
    >
      <Icon icon={ActiveIcon} size="md" />
    </ToolButton>
  );

  return (
    <Dropdown
      trigger={trigger}
      align="after"
      side="bottom"
      contentClassName="p-2 w-64"
    >
      <DropdownLabel>Brushes</DropdownLabel>
      <div className="grid grid-cols-3 gap-1">
        {TOOLS.map(({ mode, label, icon }) => (
          <button
            key={mode}
            type="button"
            title={label}
            onClick={() => selectTool(mode)}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-colors",
              activeTool === mode
                ? "bg-primary/15 text-primary"
                : "text-base-content/70 hover:bg-base-content/10",
            )}
          >
            <Icon icon={icon} size="md" />
            {label.split(" ")[0]}
          </button>
        ))}
      </div>

      {activeTool === "bulk" || activeTool === "eraser" ? (
        <div className="mt-1 space-y-2 border-t border-base-content/10 pt-2">
          <label className="flex items-center justify-between text-xs font-bold text-base-content/70">
            Size
            <span className="tabular-nums">
              {activeTool === "bulk" ? bulkPaintRadius : eraserRadius}
            </span>
          </label>
          <input
            type="range"
            className="range range-xs range-primary"
            min={0}
            max={8}
            step={1}
            value={activeTool === "bulk" ? bulkPaintRadius : eraserRadius}
            onChange={(e) =>
              setValue(
                activeTool === "bulk" ? "bulkPaintRadius" : "eraserRadius",
                Number(e.target.value),
              )
            }
          />
          {activeTool === "bulk" ? (
            <div className="flex gap-1">
              {(["circle", "square"] as const).map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setValue("bulkPaintShape", shape)}
                  className={cn(
                    "flex-1 cursor-pointer rounded-lg py-1 text-[10px] font-bold capitalize transition-colors",
                    bulkPaintShape === shape
                      ? "bg-primary/15 text-primary"
                      : "text-base-content/60 hover:bg-base-content/10",
                  )}
                >
                  {shape}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTool === "variation" ? (
        <div className="mt-1 space-y-2 border-t border-base-content/10 pt-2">
          <label className="flex items-center justify-between text-xs font-bold text-base-content/70">
            Intensity
            <span className="tabular-nums">{variationIntensity}</span>
          </label>
          <input
            type="range"
            className="range range-xs range-primary"
            min={1}
            max={MAX_VARIATION_STEPS}
            step={1}
            value={variationIntensity}
            onChange={(e) =>
              setValue("variationIntensity", Number(e.target.value))
            }
          />
        </div>
      ) : null}

      <div className="mt-1 border-t border-base-content/10 pt-2">
        <DropdownItem
          onClick={() => setValue("mirrorPaint", !mirrorPaint)}
          leftIcon={
            <span className="inline-flex items-center">
              <Icon icon={ArrowsLeftRight} size="md" />
            </span>
          }
          rightIcon={
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                mirrorPaint
                  ? "bg-primary/15 text-primary"
                  : "bg-base-content/10 text-base-content/60",
              )}
            >
              {mirrorPaint ? "On" : "Off"}
            </span>
          }
        >
          Symmetry
        </DropdownItem>
      </div>
    </Dropdown>
  );
}
