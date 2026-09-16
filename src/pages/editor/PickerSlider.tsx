// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Same gesture and gradient behavior as the MineSkin original; labels are
// English and the chrome is restyled to the looms themes.
import React, { useMemo } from "react";
import { cn } from "../../editor/core/utils";

function PickerSliderComponent({
  setDragging,
  update,
  setRecentlyDragged,
  visualPosition,
  type,
  className,
}: {
  setDragging: (dragging: boolean) => void;
  update: (e: React.PointerEvent<HTMLDivElement>) => void;
  setRecentlyDragged: (recentlyDragged: boolean) => void;
  visualPosition: { hue: number; s: number; v: number; a: number };
  type: "h" | "s" | "v" | "a";
  className?: string;
}) {
  // Keyboard support for the role="slider" track: arrows nudge the value.
  const nudge = useMemo(() => {
    if (type === "h") return { value: visualPosition.hue, min: 0, max: 360, step: 3 };
    if (type === "s") return { value: visualPosition.s, min: 0, max: 100, step: 1 };
    if (type === "v") return { value: visualPosition.v, min: 0, max: 100, step: 1 };
    return { value: visualPosition.a, min: 0, max: 100, step: 1 };
  }, [type, visualPosition]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let delta = 0;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -nudge.step;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = nudge.step;
    if (delta === 0) return;
    e.preventDefault();
    const next = Math.min(
      nudge.max,
      Math.max(nudge.min, nudge.value + delta),
    );
    // Synthesize a pointer-like update at the new position.
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.left + (next / (nudge.max - nudge.min)) * rect.width;
    update({
      clientX: x,
      buttons: 1,
      currentTarget: e.currentTarget,
    } as unknown as React.PointerEvent<HTMLDivElement>);
  };
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    update(e);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) update(e);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    setRecentlyDragged(true);
    setTimeout(() => setRecentlyDragged(false), 100);
  };
  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  const { pos, background, label, ariaLabel } = useMemo(() => {
    let pos = 0;
    let background = "";
    let label = "";
    let ariaLabel = "";
    if (type === "h") {
      pos = visualPosition.hue / 360;
      background =
        "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)";
      label = "Hue";
      ariaLabel = "Hue selector";
    }
    if (type === "s") {
      pos = visualPosition.s / 100;
      background = `linear-gradient(to right, hsl(${visualPosition.hue}, 100%, 100%), hsl(${visualPosition.hue}, 100%, 50%))`;
      label = "Saturation";
      ariaLabel = "Saturation selector";
    }
    if (type === "v") {
      pos = visualPosition.v / 100;
      background = `linear-gradient(to right, hsl(${visualPosition.hue} calc(${visualPosition.s} * 1%) 0%), hsl(${visualPosition.hue} calc(${visualPosition.s} * 1%) 50%), hsl(${visualPosition.hue} calc(${visualPosition.s} * 1%) 100%))`;
      label = "Lightness";
      ariaLabel = "Lightness selector";
    }
    if (type === "a") {
      pos = visualPosition.a / 100;
      background = `linear-gradient(to right, transparent, hsl(${visualPosition.hue} calc(${visualPosition.s} * 1%) calc(${visualPosition.v} * 0.5%)))`;
      label = "Opacity";
      ariaLabel = "Opacity selector";
    }
    return { pos, background, label, ariaLabel };
  }, [visualPosition, type]);

  const sliderTrack = (
    <div
      className="relative h-4 w-full cursor-pointer rounded-lg outline-none focus:ring-2 focus:ring-primary/60"
      style={{
        backgroundImage: background,
        touchAction: "pan-y",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={nudge.min}
      aria-valuemax={nudge.max}
      aria-valuenow={Math.round(nudge.value)}
    >
      <div
        className="absolute size-4 rounded-lg border-2 border-white outline-none ring-1 ring-black/70"
        style={{
          left: `${pos * (100 - 4) + 2}%`,
          transform: "translateX(-50%)",
        }}
        aria-hidden="true"
      />
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="block text-sm font-semibold text-base-content/85">
        {label}
      </label>
      {type === "a" ? (
        <div
          className="rounded-lg"
          style={{
            backgroundImage:
              "repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)",
            backgroundSize: "8px 8px",
          }}
        >
          {sliderTrack}
        </div>
      ) : (
        sliderTrack
      )}
    </div>
  );
}

export const PickerSlider = React.memo(PickerSliderComponent);
