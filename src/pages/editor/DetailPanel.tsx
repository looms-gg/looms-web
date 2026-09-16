// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on looms primitives: the MineSkin original used radix dialog +
// framer-motion + i18n. Same behaviors: a side drawer on desktop, a bottom
// sheet on touch, closed by the close button or outside interaction.
import { type ReactNode, useEffect } from "react";
import { cn } from "../../editor/core/utils";
import useIsTouch from "./controls/useIsTouch";
import { Icon } from "../../components/ui/Icon";
import { CloseButton } from "../../components/ui/CloseButton";
import { X } from "@phosphor-icons/react";

export interface DetailPanelProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  children?: ReactNode;
  className?: string;
}

export default function DetailPanel({
  open,
  setOpen,
  children,
  className,
}: DetailPanelProps) {
  const isTouch = useIsTouch();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed z-40",
        isTouch
          ? "inset-x-2 bottom-2 max-h-[60dvh]"
          : "right-3 top-3 bottom-3 w-[330px]",
        className,
      )}
      role="dialog"
      aria-label="Editor settings"
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/95 shadow-2xl backdrop-blur">
        <div className="flex shrink-0 items-center justify-between px-4 pt-3">
          <h3 className="text-base font-extrabold tracking-tight text-base-content">
            Settings
          </h3>
          <button
            type="button"
            aria-label="Close settings"
            onClick={() => setOpen(false)}
            className="grid size-8 cursor-pointer place-items-center rounded-lg text-base-content/60 transition-colors hover:bg-base-content/10 hover:text-base-content"
          >
            <Icon icon={X} size="md" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
}

export function DetailPanelExitButton({ onClick }: { onClick: () => void }) {
  return <CloseButton onClick={onClick} />;
}
