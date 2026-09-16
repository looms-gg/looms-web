// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Restyled to the looms themes with phosphor icons.
import React from "react";
import { useRendererStore } from "../../editor/store";
import type { FormValues } from "../../editor/types";
import { cn } from "../../editor/core/utils";
import { Icon } from "../../components/ui/Icon";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { PartButton } from "./PartButton";

type Part = "head" | "body" | "leftArm" | "rightArm" | "leftLeg" | "rightLeg";
type Layer = "base" | "overlay";

// Humanoid silhouette on a 4-column grid (viewer perspective, always LTR)
const GRID_PARTS: { part: Part; col: string; row: string }[] = [
  { part: "head", col: "2 / 4", row: "1" },
  { part: "leftArm", col: "1", row: "2" },
  { part: "body", col: "2 / 4", row: "2" },
  { part: "rightArm", col: "4", row: "2" },
  { part: "leftLeg", col: "2", row: "3" },
  { part: "rightLeg", col: "3", row: "3" },
];

const DesktopPartFilter: React.FC<{ className?: string; scale?: number }> = ({
  className,
  scale = 1.2,
}) => {
  const setValue = useRendererStore((s) => s.setValue) as (
  key: keyof FormValues,
  value: FormValues[keyof FormValues],
) => void;

  // Grid cell unit; head is 2x2 cells, body 2x3, arms/legs 1x3
  const cell = Math.floor(9 * scale);

  const state = useRendererStore((s) => s);
  const visibility: Record<Layer, Record<Part, boolean>> = {
    base: {
      head: state.baseheadVisible,
      body: state.basebodyVisible,
      leftArm: state.baseleftArmVisible,
      rightArm: state.baserightArmVisible,
      leftLeg: state.baseleftLegVisible,
      rightLeg: state.baserightLegVisible,
    },
    overlay: {
      head: state.overlayheadVisible,
      body: state.overlaybodyVisible,
      leftArm: state.overlayleftArmVisible,
      rightArm: state.overlayrightArmVisible,
      leftLeg: state.overlayleftLegVisible,
      rightLeg: state.overlayrightLegVisible,
    },
  };

  const toggleVisibility = (layer: Layer, part: Part) => {
    setValue(
      `${layer}${part}Visible` as keyof FormValues,
      !visibility[layer][part] as never,
    );
  };

  const toggleWholeLayer = (layer: Layer) => {
    const next = !Object.values(visibility[layer]).some(Boolean);
    (Object.keys(visibility[layer]) as Part[]).forEach((part) =>
      setValue(`${layer}${part}Visible` as keyof FormValues, next as never),
    );
  };

  const tooltips: Record<Layer, Record<Part, string>> = {
    base: {
      head: "Toggle head",
      body: "Toggle body",
      leftArm: "Toggle left arm",
      rightArm: "Toggle right arm",
      leftLeg: "Toggle left leg",
      rightLeg: "Toggle right leg",
    },
    overlay: {
      head: "Toggle hat layer",
      body: "Toggle jacket layer",
      leftArm: "Toggle left sleeve",
      rightArm: "Toggle right sleeve",
      leftLeg: "Toggle left pants",
      rightLeg: "Toggle right pants",
    },
  };

  const layers: { layer: Layer; label: string }[] = [
    { layer: "base", label: "Body" },
    { layer: "overlay", label: "Armor" },
  ];

  return (
    <div className={cn("relative", className)}>
      <div className="flex justify-around gap-3">
        {layers.map(({ layer, label }) => {
          const anyVisible = Object.values(visibility[layer]).some(Boolean);
          return (
            <div
              key={layer}
              className="group pointer-events-auto flex flex-col items-center gap-1.5"
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
                {GRID_PARTS.map(({ part, col, row }) => (
                  <PartButton
                    key={part}
                    tooltip={tooltips[layer][part]}
                    onClick={() => toggleVisibility(layer, part)}
                    style={{ gridColumn: col, gridRow: row }}
                    className={cn(
                      "pointer-events-auto box-border cursor-pointer rounded-[3px] border hover:ring-2 hover:ring-primary/70",
                      visibility[layer][part]
                        ? layer === "base"
                          ? "border-base-content/60 bg-base-content/40"
                          : "border-primary bg-primary"
                        : "border-base-content/20 bg-base-content/10",
                    )}
                  >
                    <span className="sr-only">{tooltips[layer][part]}</span>
                  </PartButton>
                ))}
              </div>
              <PartButton
                tooltip="Toggle whole layer"
                onClick={() => toggleWholeLayer(layer)}
                className="pointer-events-auto flex h-5 w-6 cursor-pointer items-center justify-center rounded-md border border-base-content/15 bg-base-100 text-base-content/70 transition-colors hover:bg-base-content/10"
              >
                {anyVisible ? <Icon icon={Eye} size="xs" /> : <Icon icon={EyeSlash} size="xs" />}
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
