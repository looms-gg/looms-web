// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Adapted for looms: the two silhouettes are the body guide and the garment
// layer being painted, instead of MineSkin's base/armor UV-layer split.
import React from "react";
import { useRendererStore } from "../../editor/store";
import type { FormValues, Parts } from "../../editor/types";
import { cn } from "../../editor/core/utils";
import { Icon } from "../../components/ui/Icon";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { PartButton } from "./PartButton";

type Layer = "body" | "layer";

// Humanoid silhouette on a 4-column grid (viewer perspective, always LTR)
const GRID_PARTS: { part: Parts; col: string; row: string }[] = [
  { part: "head", col: "2 / 4", row: "1" },
  { part: "leftArm", col: "1", row: "2" },
  { part: "body", col: "2 / 4", row: "2" },
  { part: "rightArm", col: "4", row: "2" },
  { part: "leftLeg", col: "2", row: "3" },
  { part: "rightLeg", col: "3", row: "3" },
];

const PART_LABELS: Record<Parts, string> = {
  head: "head",
  body: "torso",
  leftArm: "left arm",
  rightArm: "right arm",
  leftLeg: "left leg",
  rightLeg: "right leg",
};

const LAYER_KEYS: Record<Parts, [keyof FormValues, keyof FormValues]> = {
  head: ["baseheadVisible", "overlayheadVisible"],
  body: ["basebodyVisible", "overlaybodyVisible"],
  leftArm: ["baseleftArmVisible", "overlayleftArmVisible"],
  rightArm: ["baserightArmVisible", "overlayrightArmVisible"],
  leftLeg: ["baseleftLegVisible", "overlayleftLegVisible"],
  rightLeg: ["baserightLegVisible", "overlayrightLegVisible"],
};

export interface DesktopPartFilterProps {
  className?: string;
  scale?: number;
  /** Per-part visibility of the guide body; toggles call back to the renderer. */
  guideVisibility: Record<Parts, boolean>;
  onToggleGuidePart: (part: Parts) => void;
}

const DesktopPartFilter: React.FC<DesktopPartFilterProps> = ({
  className,
  scale = 2.2,
  guideVisibility,
  onToggleGuidePart,
}) => {
  const state = useRendererStore((s) => s);
  const setValue = state.setValue;

  // Grid cell unit; head is 2x2 cells, body 2x3, arms/legs 1x3
  const cell = Math.floor(9 * scale);

  const toggleLayerPart = (part: Parts) => {
    const next = !LAYER_KEYS[part].some((key) => state[key] as boolean);
    for (const key of LAYER_KEYS[part]) {
      setValue(key, next as never);
    }
  };

  const toggleWholeLayer = (layer: Layer) => {
    if (layer === "body") {
      const anyVisible = GRID_PARTS.some(
        ({ part }) => guideVisibility[part],
      );
      GRID_PARTS.forEach(({ part }) => {
        if (anyVisible === guideVisibility[part]) onToggleGuidePart(part);
      });
      return;
    }
    const anyVisible = GRID_PARTS.some(({ part }) =>
      LAYER_KEYS[part].some((key) => state[key] as boolean),
    );
    const next = !anyVisible;
    GRID_PARTS.forEach(({ part }) => {
      for (const key of LAYER_KEYS[part]) {
        setValue(key, next as never);
      }
    });
  };

  const tooltips: Record<Layer, (part: Parts) => string> = {
    body: (part) => `Toggle the ${PART_LABELS[part]} of the guide body`,
    layer: (part) => `Toggle the ${PART_LABELS[part]} of your layer`,
  };

  const layers: { layer: Layer; label: string }[] = [
    { layer: "body", label: "Body" },
    { layer: "layer", label: "Layer" },
  ];

  return (
    <div className={cn("relative", className)}>
      <div className="flex justify-around gap-3">
        {layers.map(({ layer, label }) => {
          const anyVisible =
            layer === "body"
              ? GRID_PARTS.some(({ part }) => guideVisibility[part])
              : GRID_PARTS.some(({ part }) =>
                  LAYER_KEYS[part].some((key) => state[key] as boolean),
                );
          return (
            <div
              key={layer}
              className="pointer-events-auto flex flex-col items-center gap-1.5"
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-base-content/60">
                {label}
              </span>
              <div
                dir="ltr"
                className="grid gap-[2px]"
                style={{
                  gridTemplateColumns: `repeat(4, ${cell}px)`,
                  gridTemplateRows: `${2 * cell}px ${3 * cell}px ${3 * cell}px`,
                }}
              >
                {GRID_PARTS.map(({ part, col, row }) => {
                  const visible =
                    layer === "body"
                      ? guideVisibility[part]
                      : LAYER_KEYS[part].some((key) => state[key] as boolean);
                  return (
                    <PartButton
                      key={part}
                      tooltip={tooltips[layer](part)}
                      onClick={() =>
                        layer === "body"
                          ? onToggleGuidePart(part)
                          : toggleLayerPart(part)
                      }
                      style={{ gridColumn: col, gridRow: row }}
                      className={cn(
                        "pointer-events-auto box-border cursor-pointer rounded-[3px] border hover:ring-2 hover:ring-primary/70",
                        visible
                          ? layer === "body"
                            ? "border-base-content/60 bg-base-content/40"
                            : "border-primary bg-primary"
                          : "border-base-content/20 bg-base-content/10",
                      )}
                    >
                      <span className="sr-only">{tooltips[layer](part)}</span>
                    </PartButton>
                  );
                })}
              </div>
              <PartButton
                tooltip="Toggle whole layer"
                onClick={() => toggleWholeLayer(layer)}
                className="pointer-events-auto flex h-5 w-6 items-center justify-center rounded-md border border-base-content/15 bg-base-100 text-base-content/70 transition-colors hover:bg-base-content/10"
              >
                {anyVisible ? (
                  <Icon icon={Eye} size="xs" />
                ) : (
                  <Icon icon={EyeSlash} size="xs" />
                )}
                <span className="sr-only">Toggle whole layer</span>
              </PartButton>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(DesktopPartFilter);
