// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Restyled to the looms themes; phosphor icons via the Icon wrapper.
import { forwardRef, type PropsWithChildren, type Ref } from "react";
import { cn } from "../../editor/core/utils";

interface ToolButtonProps extends PropsWithChildren {
  label: string;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
  /** Renders a small flyout indicator in the corner (grouped tool slot). */
  grouped?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Rail tool button for the floating toolbar. Quiet when idle; the active tool
 * gets the primary accent slab.
 */
const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(
  (
    {
      label,
      className = "",
      children,
      disabled = false,
      active = false,
      grouped = false,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        {...rest}
        type="button"
        aria-label={label}
        aria-pressed={active}
        title={label}
        disabled={disabled}
        ref={ref}
        className={cn(
          "group relative grid h-9 w-9 place-items-center rounded-xl outline-none",
          "transition-[transform,background-color,color] duration-200 ease-out",
          "active:scale-[0.92] focus-visible:ring-2 focus-visible:ring-primary/60",
          disabled
            ? "cursor-not-allowed opacity-35 text-base-content/50"
            : "cursor-pointer",
          active && "bg-primary text-primary-content",
          !active &&
            !disabled &&
            "text-base-content/60 hover:bg-base-content/10 hover:text-base-content",
          className,
        )}
      >
        <span
          className={cn(
            "grid size-[22px] place-items-center transition-transform duration-200",
            !disabled && "group-active:scale-90",
          )}
        >
          {children}
        </span>

        {grouped && (
          <span
            aria-hidden
            className={cn(
              "absolute bottom-[2px] right-[2px] h-0 w-0 border-b-[5px] border-l-[5px] border-b-transparent transition-colors duration-200",
              active
                ? "border-l-primary-content/70"
                : "border-l-base-content/40",
            )}
          />
        )}
      </button>
    );
  },
);

ToolButton.displayName = "ToolButton";

export default ToolButton;
