// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Rebuilt on daisyUI's toggle: the MineSkin original was a radix-ui switch.
interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  id: string;
  disabled?: boolean;
}

export default function ToggleSwitch({
  label,
  checked,
  onCheckedChange,
  id,
  disabled,
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        className="select-none text-sm font-semibold text-base-content/80"
        htmlFor={id}
      >
        {label}
      </label>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        id={id}
        disabled={disabled}
      />
    </div>
  );
}
