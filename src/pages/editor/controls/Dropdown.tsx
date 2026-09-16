// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: the MineSkin original used radix-ui dropdown,
// which is not part of this stack. Same API surface, controlled open state,
// outside-pointer + Escape dismissal via the shared useDismissable hook.
import { useRef, useState, type ReactNode } from "react";
import { useDismissable } from "../../../components/shell/useDismissable";
import { cn } from "../../../editor/core/utils";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
}

export interface DropdownItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "default" | "destructive";
  className?: string;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function DropdownItem({
  children,
  variant = "default",
  className,
  disabled = false,
  leftIcon,
  rightIcon,
  ...props
}: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-semibold transition-colors",
        variant === "destructive"
          ? "text-error hover:bg-error/10"
          : "text-base-content/85 hover:bg-base-content/10 hover:text-base-content",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="inline-flex items-center">{leftIcon}</span>}
      {children}
      {rightIcon && (
        <span className="ml-auto inline-flex items-center pl-2">{rightIcon}</span>
      )}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-base-content/10" />;
}

export function DropdownLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-base-content/50",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function Dropdown({
  trigger,
  children,
  size = "md",
  contentClassName,
  align = "center",
  side = "bottom",
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useDismissable(open, rootRef, () => setOpen(false));

  return (
    <div ref={rootRef} className="relative inline-block">
      <div
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </div>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute z-50 min-w-[200px] rounded-xl border border-base-content/10 bg-base-200 p-1.5 shadow-xl backdrop-blur",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-lg",
            align === "start" && "left-0",
            align === "center" && "left-1/2 -translate-x-1/2",
            align === "end" && "right-0",
            side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5",
            contentClassName,
          )}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("[role='menuitem']")) {
              setOpen(false);
            }
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
