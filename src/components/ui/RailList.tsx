import { Icon, type IconType } from "./Icon"

export type RailListItem<T extends string> = {
  id: T
  icon: IconType
  label: string
}

export function RailList<T extends string>({
  label,
  items,
  selected,
  onPick,
  variant = "rows",
}: {
  label: string
  items: RailListItem<T>[]
  selected: T
  onPick: (id: T) => void
  variant?: "rows" | "tiles"
}) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === selected),
  )
  const tiled = variant === "tiles"

  return (
    <div role="listbox" aria-label={label} className="rail-list">
      <span
        className="rail-thumb"
        aria-hidden
        style={{
          transform: `translateY(calc(${index} * (100% + 4px)))`,
        }} />
      {items.map((item) => {
        const on = item.id === selected
        return (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={on}
            aria-label={tiled ? item.label : undefined}
            onClick={() => onPick(item.id)}
            className={`rail-row ${tiled ? "rail-tile" : ""} ${on ? "rail-row-on" : ""}`}
          >
            <Icon icon={item.icon} size={tiled ? "md" : "sm"} className="shrink-0" />
            <span className={tiled ? "rail-tile-label" : undefined}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
