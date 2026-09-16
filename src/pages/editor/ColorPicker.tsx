// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Faithful rebuild of the MineSkin picker (SV square, hue/saturation/lightness/
// opacity sliders, hex commit flow, and a palette of the layer's colors) on
// looms primitives: the popover is portal-anchored instead of radix, and the
// chrome uses the looms themes. Same store wiring: paintColor, paintAlpha.
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import useIsTouch from "./controls/useIsTouch";
import { useRendererStore } from "../../editor/store";
import { cn } from "../../editor/core/utils";
import {
  expandShorthand,
  hexToAlpha,
  hexToHsv,
  hexToRgb,
  hsvToHex,
} from "../../editor/color/colorUtils";
import { PickerSlider } from "./PickerSlider";
import { ColorSwatch, swatchStyle } from "../../editor/color/ColorSwatch";

interface ColorPickerProps {
  label: string;
  id: string;
  getUniqueColors: () => string[];
}

const EDGE_MARGIN = 8;
const PANEL_GAP = 8;

function parseColorString(color: string): {
  hex: string;
  alpha: number;
  cssColor: string;
} {
  const hex = color.slice(0, 7);
  const alpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) : 255;
  const rgb = hexToRgb(hex);
  const cssColor = rgb
    ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha / 255})`
    : hex;
  return { hex, alpha, cssColor };
}

export default function ColorPicker({ id, getUniqueColors }: ColorPickerProps) {
  const value = useRendererStore((state) => state.paintColor);
  const alpha = useRendererStore((state) => state.paintAlpha);
  const setValue = useRendererStore((state) => state.setValue);

  const onChange = useCallback(
    (color: string) => {
      setValue("paintColor", color);
    },
    [setValue],
  );

  const onAlphaChange = useCallback(
    (a: number) => {
      setValue("paintAlpha", a);
    },
    [setValue],
  );

  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [visualPosition, setVisualPosition] = useState(() => ({
    hue: hexToHsv(value).h,
    s: hexToHsv(value).s,
    v: hexToHsv(value).v,
    a: (alpha / 255) * 100,
  }));
  const [lastValidHue, setLastValidHue] = useState(hexToHsv(value).h);
  const [hexInput, setHexInput] = useState(value);
  const [inputError, setInputError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uniqueColors, setUniqueColors] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState("picker");
  const [recentlyDragged, setRecentlyDragged] = useState(false);
  const recentlyDraggedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    recentlyDraggedRef.current = recentlyDragged;
  }, [recentlyDragged]);

  const isCoarse = useIsTouch();

  // Sync picker state from the store unless the user is mid-drag, so external
  // changes (eyedropper, palette swatches elsewhere) stay reflected.
  useEffect(() => {
    if (!isDragging && !recentlyDraggedRef.current) {
      const newHSV = hexToHsv(value);
      setHsv(newHSV);
      setVisualPosition({
        hue: newHSV.h,
        s: newHSV.s,
        v: newHSV.v,
        a: (alpha / 255) * 100,
      });
      if (newHSV.s > 0 && newHSV.v > 0) setLastValidHue(newHSV.h);
      setHexInput(hsvToHex(newHSV, alpha));
      setInputError("");
    }
  }, [value, alpha, isDragging]);

  useEffect(() => {
    if (open && getUniqueColors) {
      setUniqueColors(getUniqueColors());
    }
  }, [open, getUniqueColors]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        let newHex = hexInput;
        if (/^#([0-9A-Fa-f]{3})$/.test(newHex))
          newHex = expandShorthand(newHex);
        if (/^#([0-9A-Fa-f]{4})$/.test(newHex))
          newHex = expandShorthand(newHex);
        if (/^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(newHex)) {
          const parsedAlpha = hexToAlpha(newHex);
          const rgbHex = newHex.slice(0, 7);
          const newHSV = hexToHsv(rgbHex);
          if (newHSV.s === 0 || newHSV.v === 0) newHSV.h = lastValidHue;
          else setLastValidHue(newHSV.h);
          setHexInput(hsvToHex(newHSV, parsedAlpha));
          setHsv(newHSV);
          onChange(hsvToHex(newHSV));
          onAlphaChange(parsedAlpha);
        } else {
          setHexInput(hsvToHex(hsv, alpha));
        }
        setInputError("");
      }
      setOpen(newOpen);
    },
    [hexInput, hsv, lastValidHue, onChange, onAlphaChange, alpha],
  );

  // Portal placement: anchored to the trigger swatch, clamped to the viewport.
  useEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      // Anchor beside the tool rail, never on top of it.
      const left = Math.max(
        EDGE_MARGIN,
        Math.min(rect.right + PANEL_GAP + 4, window.innerWidth - 336),
      );
      const top = Math.min(rect.bottom + PANEL_GAP, window.innerHeight - 16);
      setPlacement({ top, left });
    }
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
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("pointerdown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const buttonHex = hsvToHex(hsv);
  const buttonRgb = hexToRgb(buttonHex);
  const buttonColor = buttonRgb
    ? `rgba(${buttonRgb.r},${buttonRgb.g},${buttonRgb.b},${alpha / 255})`
    : buttonHex;

  const swatchTrigger = (
    <button
      id={id}
      ref={triggerRef}
      type="button"
      aria-label="Choose color"
      aria-expanded={open}
      onClick={() => handleOpenChange(!open)}
      className="size-8 cursor-pointer rounded-lg border border-base-content/25 transition-all hover:ring-2 hover:ring-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      style={swatchStyle(buttonColor)}
    />
  );

  const handleColorSelect = (color: string) => {
    const { hex, alpha: parsedAlpha } = parseColorString(color);
    const newHSV = hexToHsv(hex);
    if (newHSV.s === 0 || newHSV.v === 0) newHSV.h = lastValidHue;
    else setLastValidHue(newHSV.h);
    setHsv(newHSV);
    setVisualPosition((prev) => ({
      ...prev,
      hue: newHSV.h,
      s: newHSV.s,
      v: newHSV.v,
      a: (parsedAlpha / 255) * 100,
    }));
    setHexInput(hex);
    onChange(hex);
    onAlphaChange(parsedAlpha);
  };

  const panel = (
    <div
      ref={panelRef}
      style={
        placement
          ? { position: "fixed", top: placement.top, left: placement.left }
          : undefined
      }
      className={cn(
        "z-50 select-none rounded-xl border border-base-content/10 bg-base-200 p-4 shadow-2xl backdrop-blur",
        "w-80 max-w-[calc(100vw-16px)]",
      )}
    >
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-base-content/10 p-1">
        {(
          [
            ["picker", "Color Picker"],
            ["palette", "Palette"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={selectedTab === tab}
            onClick={() => setSelectedTab(tab)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-sm font-bold transition-colors",
              selectedTab === tab
                ? "bg-base-100 text-base-content shadow"
                : "text-base-content/60 hover:text-base-content",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {selectedTab === "picker" ? (
        <ColorChooser
          hsv={hsv}
          setHsv={setHsv}
          visualPosition={visualPosition}
          setVisualPosition={setVisualPosition}
          lastValidHue={lastValidHue}
          setLastValidHue={setLastValidHue}
          hexInput={hexInput}
          setHexInput={setHexInput}
          inputError={inputError}
          setInputError={setInputError}
          onChange={onChange}
          onAlphaChange={onAlphaChange}
          setDragging={setIsDragging}
          setRecentlyDragged={setRecentlyDragged}
          isCoarse={isCoarse}
        />
      ) : (
        <div className="max-h-[320px] min-h-[200px] overflow-y-auto">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-2 p-2">
            {uniqueColors.length === 0 ? (
              <p className="col-span-full py-8 text-center text-xs text-base-content/55">
                Nothing painted yet. Colors you use show up here.
              </p>
            ) : (
              uniqueColors.map((color) => {
                const { hex, cssColor } = parseColorString(color);
                return (
                  <ColorSwatch
                    key={color}
                    color={cssColor}
                    selected={hex === hexInput}
                    className="aspect-square w-full transition-all hover:ring-2 hover:ring-primary/70 focus:outline-none"
                    onClick={() => handleColorSelect(color)}
                    aria-label="Select color"
                  />
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={rootRef} className="relative mx-auto size-8">
      {swatchTrigger}
      {open && placement
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}

interface ColorChooserProps {
  hsv: { h: number; s: number; v: number };
  setHsv: React.Dispatch<React.SetStateAction<{ h: number; s: number; v: number }>>;
  visualPosition: { hue: number; s: number; v: number; a: number };
  setVisualPosition: React.Dispatch<
    React.SetStateAction<{ hue: number; s: number; v: number; a: number }>
  >;
  lastValidHue: number;
  setLastValidHue: (h: number) => void;
  hexInput: string;
  setHexInput: React.Dispatch<React.SetStateAction<string>>;
  inputError: string;
  setInputError: React.Dispatch<React.SetStateAction<string>>;
  onChange: (color: string) => void;
  onAlphaChange: (alpha: number) => void;
  setDragging: (dragging: boolean) => void;
  setRecentlyDragged: (recentlyDragged: boolean) => void;
  isCoarse: boolean;
}

export const ColorChooser: React.FC<ColorChooserProps> = ({
  hsv,
  setHsv,
  visualPosition,
  setVisualPosition,
  lastValidHue,
  setLastValidHue,
  hexInput,
  setHexInput,
  inputError,
  setInputError,
  onChange,
  onAlphaChange,
  setDragging,
  setRecentlyDragged,
  isCoarse,
}) => {
  const svCanvasRef = useRef<HTMLCanvasElement>(null);
  const isInternalUpdateRef = useRef(false);
  const isDraggingSVRef = useRef(false);

  const svPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingSVRef.current = true;
    setDragging(true);
    updateSVAt(e.clientX, e.clientY);
  };

  const svPointerMove = (
    e: React.PointerEvent<HTMLCanvasElement | HTMLDivElement>,
  ) => {
    if (isDraggingSVRef.current) updateSVAt(e.clientX, e.clientY);
  };

  const svPointerEnd = (e: React.PointerEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (!isDraggingSVRef.current) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    isDraggingSVRef.current = false;
    setDragging(false);
    setRecentlyDragged(true);
    setTimeout(() => setRecentlyDragged(false), 100);
  };

  // The handle sits above the canvas, so dragging it must keep updating.
  const svHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingSVRef.current = true;
    setDragging(true);
  };

  // Call onChange when HSV changes internally (not from external prop sync)
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      onChange(hsvToHex(hsv));
    }
  }, [hsv, onChange]);

  useEffect(() => {
    const c = svCanvasRef.current;
    if (!c) return;
    c.width = c.clientWidth;
    c.height = c.clientWidth;
    const ctx = c.getContext("2d")!;
    const { width, height } = c;

    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, "#fff");
    gradH.addColorStop(1, `hsl(${hsv.h},100%,50%)`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, "rgba(0,0,0,0)");
    gradV.addColorStop(1, "#000");
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
  }, [hsv, visualPosition]);

  const updateSVAt = (clientX: number, clientY: number) => {
    const c = svCanvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const s = Math.min(
      Math.max(((clientX - rect.left) / rect.width) * 100, 0),
      100,
    );
    const v = Math.min(
      Math.max(100 - ((clientY - rect.top) / rect.height) * 100, 0),
      100,
    );
    const alpha255 = Math.round((visualPosition.a / 100) * 255);
    setVisualPosition((prev) => ({ ...prev, s, v }));
    setHsv((prev) => {
      const newHSV = { ...prev, s, v };
      const newHex = hsvToHex(newHSV, alpha255);
      setHexInput(newHex);
      isInternalUpdateRef.current = true;
      return newHSV;
    });
  };

  const update = useCallback(
    (type: "h" | "s" | "v" | "a", e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const percentage = (x / rect.width) * 100;
      const constrainedPercentage = Math.min(Math.max(percentage, 0), 100);

      if (type === "a") {
        setVisualPosition((prev) => ({ ...prev, a: constrainedPercentage }));
        const newAlpha = Math.round((constrainedPercentage / 100) * 255);
        onAlphaChange(newAlpha);
        setHexInput(hsvToHex(hsv, newAlpha));
        return;
      }

      const alpha255 = Math.round((visualPosition.a / 100) * 255);
      setVisualPosition((prev) => ({
        ...prev,
        [type === "h" ? "hue" : type]:
          constrainedPercentage * (type === "h" ? 3.6 : 1),
      }));
      setHsv((prev) => {
        const newHSV = {
          ...prev,
          [type]: constrainedPercentage * (type === "h" ? 3.6 : 1),
        };
        const newHex = hsvToHex(newHSV, alpha255);
        setHexInput(newHex);
        isInternalUpdateRef.current = true;
        return newHSV;
      });
    },
    [setHsv, setVisualPosition, setHexInput, onAlphaChange, hsv, visualPosition.a],
  );

  const handleHexInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const str = e.target.value;
    const corrected = `#${str.replace(/[^0-9A-Fa-f]/g, "")}`;
    setHexInput(corrected);
  };

  const handleHexInputPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim();
    const cleaned = pasted.replace(/[^0-9A-Fa-f]/g, "").slice(0, 8);
    if (cleaned.length > 0) {
      setHexInput(`#${cleaned}`);
    }
  };

  const handleHexInputConfirm = () => {
    let newHex = hexInput;
    if (/^#([0-9A-Fa-f]{3})$/.test(newHex)) newHex = expandShorthand(newHex);
    if (/^#([0-9A-Fa-f]{4})$/.test(newHex)) newHex = expandShorthand(newHex);
    const isValid = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(newHex);
    if (!isValid && newHex.length > 0) {
      setInputError("That hex code isn't valid.");
      const alpha255 = Math.round((visualPosition.a / 100) * 255);
      setHexInput(hsvToHex(hsv, alpha255));
    } else {
      setInputError("");
      if (isValid) {
        const parsedAlpha = hexToAlpha(newHex);
        const rgbHex = newHex.slice(0, 7);
        const newHSV = hexToHsv(rgbHex);
        if (newHSV.s === 0 || newHSV.v === 0) newHSV.h = lastValidHue;
        else setLastValidHue(newHSV.h);
        setHexInput(hsvToHex(newHSV, parsedAlpha));
        setVisualPosition((prev) => ({ ...prev, a: (parsedAlpha / 255) * 100 }));
        onAlphaChange(parsedAlpha);
        isInternalUpdateRef.current = true;
        setHsv(newHSV);
      }
    }
  };

  const handleHexInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleHexInputConfirm();
    else if (e.key === "Escape") {
      const alpha255 = Math.round((visualPosition.a / 100) * 255);
      setHexInput(hsvToHex(hsv, alpha255));
      setInputError("");
    }
  };

  return (
    <div className="flex flex-col">
      <div className="mb-4 flex-1">
        <label className="mb-2 block text-sm font-semibold text-base-content/85">
          Saturation &amp; Lightness
        </label>
        <div className="relative aspect-square w-full">
          <canvas
            ref={svCanvasRef}
            className="absolute inset-0 size-full cursor-pointer rounded-lg"
            style={{ touchAction: "pan-y" }}
            onPointerDown={svPointerDown}
            onPointerMove={svPointerMove}
            onPointerUp={svPointerEnd}
            onPointerCancel={svPointerEnd}
            role="slider"
            tabIndex={0}
            aria-label="Saturation and lightness selector"
          />
          <div
            className="absolute size-6 cursor-grab rounded-lg border-2 border-white ring-1 ring-black/70 active:cursor-grabbing"
            style={{
              left: `${visualPosition.s}%`,
              top: `${100 - visualPosition.v}%`,
              transform: "translate(-50%, -50%)",
              backgroundColor: hsvToHex(hsv),
              touchAction: "none",
            }}
            onPointerDown={svHandlePointerDown}
            onPointerMove={svPointerMove}
            onPointerUp={svPointerEnd}
            onPointerCancel={svPointerEnd}
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <PickerSlider
          setDragging={setDragging}
          update={(e) => update("h", e)}
          setRecentlyDragged={setRecentlyDragged}
          visualPosition={visualPosition}
          type="h"
        />

        {!isCoarse && (
          <>
            <PickerSlider
              setDragging={setDragging}
              update={(e) => update("s", e)}
              setRecentlyDragged={setRecentlyDragged}
              visualPosition={visualPosition}
              type="s"
            />
            <PickerSlider
              setDragging={setDragging}
              update={(e) => update("v", e)}
              setRecentlyDragged={setRecentlyDragged}
              visualPosition={visualPosition}
              type="v"
            />
          </>
        )}
        <PickerSlider
          setDragging={setDragging}
          update={(e) => update("a", e)}
          setRecentlyDragged={setRecentlyDragged}
          visualPosition={visualPosition}
          type="a"
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="hexInput"
          className="mb-1 block text-sm font-semibold text-base-content/85"
        >
          Hex Code
        </label>
        <input
          id="hexInput"
          type="text"
          value={hexInput}
          onChange={handleHexInputChange}
          onPaste={handleHexInputPaste}
          onBlur={handleHexInputConfirm}
          onKeyDown={handleHexInputKeyDown}
          placeholder="#FFFFFF"
          className={cn(
            "w-full rounded-lg border bg-base-100 p-2 font-mono text-base-content select-text focus:outline-none focus:ring-2 focus:ring-primary/30",
            inputError ? "border-error" : "border-base-content/25",
          )}
        />
        {inputError ? (
          <p className="mt-1 select-none text-xs text-error">{inputError}</p>
        ) : null}
        <p className="mt-1 text-xs text-base-content/60">
          Press Enter to confirm or Escape to cancel
        </p>
      </div>
    </div>
  );
};
