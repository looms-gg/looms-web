import { useRef, useState } from "react"
import { CaretDown, Check } from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { HoverTip } from "../../components/ui/HoverTip"
import { DROPDOWN_ITEM, DROPDOWN_MENU } from "../../components/ui/Dropdown"
import type { BucketMode } from "./useSkinEditor"
import { useDismissable } from "../../components/shell/useDismissable"

const FILL_MODES: { id: BucketMode; label: string }[] = [
  { id: "face", label: "Face" },
  { id: "element", label: "Element" },
  { id: "selectedElements", label: "Selected Elements" },
  { id: "connectedColors", label: "Connected Colors" },
  { id: "colors", label: "Colors" },
]

const FILL_TITLES: Record<BucketMode, string> = {
  face: "Fill the whole face under the cursor",
  element: "Fill every face of the clicked element",
  selectedElements: "Fill every currently visible element",
  connectedColors: "Flood fill the matching connected area",
  colors: "Replace every texel of the clicked color",
}

const BUTTON = "tactile-select-trigger h-7 min-h-0 rounded-lg px-2 text-xs"
const MENU =
  `absolute z-50 w-max min-w-full ${DROPDOWN_MENU}`
const ITEM = (active: boolean) =>
  `w-full !justify-start gap-2 ${DROPDOWN_ITEM(active)}`

export function BucketFillDropdown({
  value,
  onChange,
  placement = "bottom",
}: {
  value: BucketMode
  onChange: (m: BucketMode) => void
  placement?: "bottom" | "right"
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useDismissable(open, rootRef, () => setOpen(false))

  const current = FILL_MODES.find((m) => m.id === value) ?? FILL_MODES[0]
  const placementClass =
    placement === "bottom" ? "left-0 top-full mt-1.5" : "left-full top-0 ml-1.5"

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <HoverTip tip="Bucket Fill Mode" visible={!open}>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Bucket Fill Mode"
          aria-expanded={open}
          title={FILL_TITLES[value]}
          className={BUTTON}
        >
          {current.label}
          <Icon
            icon={CaretDown}
            size="xs"
            className={`shrink-0 opacity-60 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </HoverTip>

      {open && (
        <div
          role="menu"
          aria-label="Bucket Fill Mode Options"
          className={`${MENU} ${placementClass}`}
        >
          {FILL_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={value === m.id}
              aria-label={`Fill Mode ${m.label}`}
              title={FILL_TITLES[m.id]}
              onClick={() => {
                onChange(m.id)
                setOpen(false)
              }}
              className={ITEM(value === m.id)}
            >
              <span className="grow">{m.label}</span>
              <Icon
                icon={Check}
                size="xs"
                className={value === m.id ? "shrink-0" : "invisible"}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
