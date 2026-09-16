// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Restyled to the looms themes: daisyUI tokens replace the MineSkin blue
// palette, and the phosphor Icon wrapper is what callers pass as children.
import { forwardRef, type PropsWithChildren, type Ref } from "react";
import { cn } from "../../../editor/core/utils";

interface IconButtonProps extends PropsWithChildren {
  label: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      className = "",
      children,
      disabled = false,
      active = false,
      ...rest
    },
    ref,
  ) => {
    return (
      <button
        {...rest}
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        className={cn(
          "grid place-items-center rounded-lg border-none p-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          active
            ? "bg-primary text-primary-content"
            : "text-base-content/80 hover:bg-base-content/10 hover:text-base-content",
          className,
        )}
        ref={ref}
      >
        <span className="size-6">{children}</span>
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

export default IconButton;
