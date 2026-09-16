// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt with a daisyUI tooltip instead of radix-ui tooltip.
import type { CSSProperties, ReactNode } from "react";

export interface PartButtonProps {
  tooltip: string;
  onClick: () => void;
  style?: CSSProperties;
  className?: string;
  children?: ReactNode;
}

export const PartButton: React.FC<PartButtonProps> = ({
  tooltip,
  onClick,
  style,
  className,
  children,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`tooltip tooltip-top before:whitespace-nowrap ${className ?? ""}`}
      data-tip={tooltip}
    >
      {children}
    </button>
  );
};
