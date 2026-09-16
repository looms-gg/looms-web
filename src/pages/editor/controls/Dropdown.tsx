// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: the MineSkin original used radix-ui dropdown,
// which is not part of this stack. Same API surface, controlled open state,
// outside-pointer + Escape dismissal via the shared useDismissable hook.
// The panel renders through a portal anchored to the trigger's viewport rect,
// so callers inside overflow containers (the tool rail) are not clipped.
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../editor/core/utils";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
  contentClassName?: string;
  align?: "start" | "center" | "end" | "after";
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

const EDGE_MARGIN = 8;
const PANEL_GAP = 6;

interface PanelPlacement {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  transform?: string;
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);

  // Outside-pointer + Escape dismissal. The portal panel is not a DOM child
  // of the root, so the hit test must cover both elements.
  useEffect(() => {
    if (!open) return;
    function handlePointer(e: PointerEvent) {
      const target = e.target as Node;
      if (
        !rootRef.current?.contains(target) &&
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

  function computePlacement(): PanelPlacement {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return {};
    const p: PanelPlacement = {};
    if (side === "bottom") {
      p.top = rect.bottom + PANEL_GAP;
    } else {
      p.bottom = window.innerHeight - rect.top + PANEL_GAP;
    }
    if (align === "start") {
      p.left = Math.max(EDGE_MARGIN, rect.left);
    } else if (align === "after") {
      // Opens to the right of the trigger (plus a gap), so flyouts anchored
      // inside a tool rail never cover the rail itself.
      p.left = rect.right + PANEL_GAP + 4;
    } else if (align === "end") {
      p.right = Math.max(EDGE_MARGIN, window.innerWidth - rect.right);
    } else if (align === "center") {
      p.left = rect.left + rect.width / 2;
      p.transform = "translateX(-50%)";
    }
    return p;
  }

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

  function toggle() {
    const next = !open;
    if (next) setPlacement(computePlacement());
    setOpen(next);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <div
        ref={triggerRef}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        {trigger}
      </div>
      {open && placement
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              style={placement as CSSProperties}
              className={cn(
                "fixed z-50 min-w-[200px] rounded-xl border border-base-content/10 bg-base-200 p-1.5 shadow-xl backdrop-blur",
                size === "sm" && "text-sm",
                size === "md" && "text-base",
                size === "lg" && "text-lg",
                contentClassName,
              )}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[role='menuitem']")) {
                  setOpen(false);
                }
              }}
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
