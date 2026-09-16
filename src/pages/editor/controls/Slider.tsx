// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on a native <input type="range">: the MineSkin original used
// radix-ui slider, tooltip, and the i18n dictionary, none of which are part of
// this stack. Same API surface and reset affordance.
import { memo } from "react";
import { defaultFormValues } from "../../../editor/store";
import { cn } from "../../../editor/core/utils";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  error?: string;
  formatValue?: (value: number) => string;
  loop?: boolean;
  editKey: string;
  disabled?: boolean;
  disabledTooltip?: string;
}

function SliderImpl({
  label,
  value,
  onChange,
  min,
  max,
  step,
  error,
  loop = false,
  formatValue = (v) => v.toFixed(2),
  editKey: key,
  disabled = false,
  disabledTooltip,
}: SliderProps) {
  const defaultValue =
    defaultFormValues[key as keyof typeof defaultFormValues];
  const showReset =
    !disabled &&
    typeof defaultValue === "number" &&
    defaultValue !== value &&
    !loop;

  const content = (
    <div className={cn("mb-4", disabled && "opacity-50")}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-base-content/80">
          <span className="break-words">{label}</span>
          {disabled && disabledTooltip && (
            <span
              className="shrink-0 text-base-content/50"
              title={disabledTooltip}
              aria-label={disabledTooltip}
            >
              ?
            </span>
          )}
        </label>
        <span
          className={cn(
            "w-14 shrink-0 text-right text-sm tabular-nums",
            error ? "text-error" : "text-base-content/60",
          )}
        >
          {formatValue(value)}
        </span>
      </div>
      <div className="flex w-full items-center">
        <input
          type="range"
          className={cn(
            "range range-xs range-primary w-full",
            error && "range-error",
          )}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          value={loop
            ? Math.abs((value % (max - min)) + min)
            : Math.min(Math.max(value, min), max)}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
      </div>
      {error ? <p className="mt-1 text-sm text-error">{error}</p> : null}
      {showReset ? (
        <button
          type="button"
          className="mt-1 cursor-pointer text-xs font-bold text-primary hover:underline"
          onClick={() => onChange(defaultValue as number)}
        >
          Reset
        </button>
      ) : null}
    </div>
  );

  if (disabled && disabledTooltip) {
    return (
      <div className="tooltip tooltip-top before:max-w-xs before:whitespace-normal w-full" data-tip={disabledTooltip}>
        {content}
      </div>
    );
  }

  return content;
}

export default memo(SliderImpl);
