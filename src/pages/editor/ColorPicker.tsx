// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: the MineSkin original used radix popover +
// framer-motion + i18n. Same store wiring: paintColor and paintAlpha.
import { useCallback, useState } from "react";
import { useRendererStore } from "../../editor/store";
import { ColorSwatch, swatchStyle } from "../../editor/color/ColorSwatch";
import Dropdown from "./controls/Dropdown";

export interface ColorPickerProps {
  label: string;
  id?: string;
  getUniqueColors: () => string[];
}

export default function ColorPicker({
  id = "color-picker",
  getUniqueColors,
}: ColorPickerProps) {
  const paintColor = useRendererStore((s) => s.paintColor);
  const paintAlpha = useRendererStore((s) => s.paintAlpha);
  const setValue = useRendererStore((s) => s.setValue);
  const [recent, setRecent] = useState<string[]>([]);

  const refreshRecent = useCallback(() => {
    setRecent(getUniqueColors().slice(0, 10));
  }, [getUniqueColors]);

  const trigger = (
    <button
      type="button"
      title="Color"
      aria-label="Color"
      className="grid size-8 cursor-pointer place-items-center rounded-lg transition-transform active:scale-90"
    >
      <span
        className="block size-7 rounded-lg border border-base-content/15"
        style={swatchStyle(paintColor)}
      />
    </button>
  );

  return (
    <Dropdown
      trigger={trigger}
      align="start"
      side="bottom"
      contentClassName="p-3 w-56 space-y-3"
    >
      <div>
        <label
          htmlFor={`${id}-input`}
          className="mb-1 block text-xs font-extrabold uppercase tracking-wide text-base-content/60"
        >
          Color
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-input`}
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(paintColor) ? paintColor : "#000000"}
            onChange={(e) => setValue("paintColor", e.target.value)}
            className="size-9 cursor-pointer rounded-lg bg-transparent"
          />
          <ColorSwatch color={paintColor} className="size-9" />
        </div>
      </div>

      <div>
        <label
          htmlFor={`${id}-alpha`}
          className="mb-1 flex items-center justify-between text-xs font-extrabold uppercase tracking-wide text-base-content/60"
        >
          Opacity
          <span className="tabular-nums">
            {Math.round((paintAlpha / 255) * 100)}%
          </span>
        </label>
        <input
          id={`${id}-alpha`}
          type="range"
          className="range range-xs range-primary"
          min={0}
          max={255}
          step={1}
          value={paintAlpha}
          onChange={(e) => setValue("paintAlpha", Number(e.target.value))}
        />
      </div>

      {recent.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-base-content/60">
            Used in this layer
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((color) => (
              <ColorSwatch
                key={color}
                color={color}
                selected={color.toUpperCase() === paintColor.toUpperCase()}
                onClick={() => {
                  setValue("paintColor", color);
                  refreshRecent();
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="btn btn-ghost btn-xs w-full rounded-full font-bold"
        onClick={refreshRecent}
      >
        Load colors from layer
      </button>
    </Dropdown>
  );
}
