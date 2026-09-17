import { useRef, useState, type ReactNode } from "react"
import { Check, CaretDown } from "@phosphor-icons/react"
import { Icon } from "./Icon"
import { useDismissable } from "../shell/useDismissable"

export interface DropdownOption<T extends string = string> {
  id: T
  label: string
}

// Canonical dropdown menu surface + item styling, shared app-wide.
export const DROPDOWN_MENU =
  "rounded-xl border border-base-content/10 bg-base-100 p-1.5 shadow-xl select-none editor-pop-in"
export const DROPDOWN_ITEM = (selected: boolean) =>
  `flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors cursor-pointer ${
    selected
      ? "bg-base-300/70 text-base-content"
      : "text-base-content/70 hover:bg-base-300/60 hover:text-base-content"
  }`

interface DropdownProps<T extends string> {
  options: readonly DropdownOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  leadingIcon?: ReactNode
  className?: string
  menuClassName?: string
  size?: "sm" | "md"
  align?: "left" | "right"
  itemClassName?: (option: DropdownOption<T>, selected: boolean) => string
}

export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  leadingIcon,
  className = "",
  menuClassName = "",
  size = "md",
  align = "left",
  itemClassName,
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useDismissable(open, rootRef, () => setOpen(false))

  const current = options.find((o) => o.id === value) ?? options[0]
  const alignClass = align === "right" ? "right-0" : "left-0"

  const triggerSizeClass =
    size === "sm"
      ? "h-7 min-h-0 rounded-lg px-2 text-xs"
      : "h-11 rounded-xl px-3.5 text-sm"

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={ariaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        className={`tactile-select-trigger ${triggerSizeClass} ${className ? "" : "shrink-0"}`}
      >
        {leadingIcon}
        <span className="tactile-select-label">{current.label}</span>
        <Icon
          icon={CaretDown}
          size="xs"
          className={`shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={`${ariaLabel} options`}
          className={`absolute top-full ${alignClass} z-50 mt-1.5 min-w-full w-max ${DROPDOWN_MENU} ${menuClassName}`}
        >
          {options.map((option) => {
            const selected = option.id === value
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  onChange(option.id)
                  setOpen(false)
                }}
                className={`${DROPDOWN_ITEM(selected)} ${itemClassName?.(option, selected) ?? ""}`}
              >
                <span>{option.label}</span>
                <Icon
                  icon={Check}
                  size="xs"
                  className={selected ? "shrink-0" : "invisible"}
                />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
