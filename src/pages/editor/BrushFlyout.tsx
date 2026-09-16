// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Faithful rebuild of the MineSkin brushes flyout: titled header with a close
// button, a 2-up tool grid with keyboard-shortcut badges (eraser spanning the
// full width), conditional size/shape/intensity controls for the active tool,
// and the symmetry row. Restyled to the looms themes, phosphor icons.
import { useCallback, useRef, useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRendererStore } from "../../editor/store";
import { cn } from "../../editor/core/utils";
import { MAX_VARIATION_STEPS } from "../../editor/core/utils";
import ToolButton from "./ToolButton";
import { Icon, type IconType } from "../../components/ui/Icon";
import {
  ArrowsLeftRight,
  Eraser,
  PencilCircle,
  PencilRuler,
  PaintBucket,
  SquareHalf,
  X,
} from "@phosphor-icons/react";

type BrushMode = "pixel" | "bulk" | "variation" | "dither" | "eraser";

const TOOLS: {
  mode: BrushMode;
  label: string;
  shortcut: string;
  icon: IconType;
}[] = [
  { mode: "pixel", label: "Pen tool", shortcut: "P", icon: PencilRuler },
  { mode: "bulk", label: "Bulk paint", shortcut: "U", icon: PaintBucket },
  { mode: "variation", label: "Shading", shortcut: "V", icon: PencilCircle },
  { mode: "dither", label: "Dither", shortcut: "D", icon: SquareHalf },
  { mode: "eraser", label: "Eraser", shortcut: "E", icon: Eraser },
];

const EDGE_MARGIN = 8;
const PANEL_GAP = 6;

// Compact slider row used inside the flyout: label left, value right, range
// track beneath.
function FlyoutSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-base-content/85">
          {label}
        </span>
        <span className="text-[13px] tabular-nums text-base-content/60">
          {display}
        </span>
      </div>
      <input
        type="range"
        className="range range-xs range-primary"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </div>
  );
}

function ShortcutBadge({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1 text-[9px] font-bold leading-tight",
        active
          ? "bg-primary-content/20 text-primary-content/90"
          : "bg-base-content/10 text-base-content/45",
      )}
    >
      {children}
    </span>
  );
}

export interface BrushFlyoutProps {
  side?: "top" | "bottom";
  tooltipSide?: "left" | "right";
}

export default function BrushFlyout({}: BrushFlyoutProps) {
  const paintMode = useRendererStore((s) => s.paintMode);
  const bulkPaintRadius = useRendererStore((s) => s.bulkPaintRadius);
  const bulkPaintShape = useRendererStore((s) => s.bulkPaintShape);
  const eraserRadius = useRendererStore((s) => s.eraserRadius);
  const variationIntensity = useRendererStore((s) => s.variationIntensity);
  const mirrorPaint = useRendererStore((s) => s.mirrorPaint);
  const setValue = useRendererStore((s) => s.setValue);

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ top: number; left: number } | null>(
    null,
  );

  const placePanel = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPlacement({
      top: rect.bottom + PANEL_GAP,
      left: Math.max(
        EDGE_MARGIN,
        Math.min(rect.right + PANEL_GAP + 4, window.innerWidth - 356),
      ),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Outside-pointer + Escape dismissal (panel is a portal, not a DOM child).
  useEffect(() => {
    if (!open) return;
    function handlePointer(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !(rootRef.current?.contains(target) ?? false) &&
        !(panelRef.current?.contains(target) ?? false)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    if (next) placePanel();
    setOpen(next);
  }

  const selectBrush = (mode: BrushMode) => {
    setValue("paintMode", mode);
    setValue("colorPickerActive", false);
  };

  const activeEntry = TOOLS.find((tool) => tool.mode === paintMode);
  const TriggerIcon = activeEntry?.icon ?? PencilRuler;

  const trigger = (
    <ToolButton label="Brushes" active={paintMode !== "pixel"} grouped>
      <Icon icon={TriggerIcon} size="md" />
    </ToolButton>
  );

  return (
    <div ref={rootRef} className="relative inline-block">
      <div ref={triggerRef} aria-haspopup="true" aria-expanded={open} onClick={toggle}>
        {trigger}
      </div>
      {open && placement
        ? createPortal(
            <div
              ref={panelRef}
              style={{ position: "fixed", top: placement.top, left: placement.left }}
              className="z-50 w-[340px] max-w-[calc(100vw-16px)] rounded-2xl border border-base-content/10 bg-base-200 p-3 shadow-2xl backdrop-blur"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-lg font-extrabold tracking-tight text-base-content">
                  Brushes
                </h3>
                <button
                  type="button"
                  aria-label="Close brushes"
                  onClick={() => setOpen(false)}
                  className="grid size-7 cursor-pointer place-items-center rounded-lg text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
                >
                  <Icon icon={X} size="md" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-base-content/5 p-1.5">
                {TOOLS.map(({ mode, label, shortcut, icon }) => {
                  const isActive = paintMode === mode;
                  const isEraser = mode === "eraser";
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => selectBrush(mode)}
                      className={cn(
                        "cursor-pointer rounded-md px-1 text-[13px] font-semibold transition-all duration-150",
                        isEraser
                          ? "col-span-2 flex flex-row items-center justify-center gap-1.5 py-2"
                          : "flex flex-col items-center gap-1.5 py-2.5",
                        isActive
                          ? "bg-primary text-primary-content shadow-md"
                          : "text-base-content/75 hover:bg-base-content/10",
                      )}
                    >
                      <Icon icon={icon} size="md" />
                      <span className="text-center leading-tight">{label}</span>
                      <ShortcutBadge active={isActive}>{shortcut}</ShortcutBadge>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 space-y-3 px-1 pb-0.5">
                {paintMode === "variation" ? (
                  <FlyoutSlider
                    label="Intensity"
                    value={variationIntensity}
                    min={1}
                    max={MAX_VARIATION_STEPS}
                    step={1}
                    display={`${variationIntensity}`}
                    onChange={(v) => setValue("variationIntensity", v)}
                  />
                ) : null}

                {paintMode === "bulk" ? (
                  <>
                    <FlyoutSlider
                      label="Radius"
                      value={bulkPaintRadius}
                      min={0}
                      max={8}
                      step={1}
                      display={bulkPaintRadius === 0 ? "Face" : `${bulkPaintRadius}px`}
                      onChange={(v) => setValue("bulkPaintRadius", v)}
                    />
                    {bulkPaintRadius > 0 ? (
                      <div className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-[13px] text-base-content/60">
                          Shape
                        </span>
                        <div className="flex flex-1 gap-1 rounded-md bg-base-content/5 p-1">
                          {(["square", "circle"] as const).map((shape) => {
                            const isActive = bulkPaintShape === shape;
                            return (
                              <button
                                key={shape}
                                type="button"
                                onClick={() => setValue("bulkPaintShape", shape)}
                                className={cn(
                                  "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-[12px] font-semibold transition-colors duration-150",
                                  isActive
                                    ? "bg-primary text-primary-content shadow-sm"
                                    : "text-base-content/75 hover:bg-base-content/10",
                                )}
                              >
                                <span
                                  aria-hidden
                                  className={cn(
                                    "size-3 border-[1.5px] border-current",
                                    shape === "circle" ? "rounded-full" : "rounded-[2px]",
                                  )}
                                />
                                {shape === "square" ? "Square" : "Circle"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {paintMode === "eraser" ? (
                  <FlyoutSlider
                    label="Size"
                    value={eraserRadius}
                    min={0}
                    max={8}
                    step={1}
                    display={`${eraserRadius * 2 + 1}px`}
                    onChange={(v) => setValue("eraserRadius", v)}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => setValue("mirrorPaint", !mirrorPaint)}
                  aria-pressed={mirrorPaint}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-[13px] font-semibold transition-colors duration-150",
                    mirrorPaint
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-base-content/15 bg-base-content/5 text-base-content/75 hover:bg-base-content/10",
                  )}
                >
                  <span className="flex-none">
                    <Icon icon={ArrowsLeftRight} size="md" />
                  </span>
                  <span className="flex-1 text-left">Symmetry</span>
                  <ShortcutBadge active={mirrorPaint}>M</ShortcutBadge>
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
