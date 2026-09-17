import { useRef, useState } from "react"
import {
  CaretUp,
  Check,
  FloppyDisk,
  PencilSimple,
  Sparkle,
} from "@phosphor-icons/react"
import { Icon } from "../../components/ui/Icon"
import { DROPDOWN_ITEM, DROPDOWN_MENU } from "../../components/ui/Dropdown"
import { useDismissable } from "../../components/shell/useDismissable"

export interface EditorActionBarProps {
  onOpenSave?: () => void
  className?: string
}

export function EditorActionBar({ onOpenSave, className = "" }: EditorActionBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useDismissable(dropdownOpen, dropdownRef, () => setDropdownOpen(false))

  const handleNavigateStudio = () => {
    if (typeof window !== "undefined") {
      try {
        window.history.pushState(null, "", "/studio")
        window.dispatchEvent(new PopStateEvent("popstate"))
      } catch {
        window.location.assign("/studio")
      }
    }
  }

  return (
    <div
      className={`fixed bottom-0 inset-x-0 hidden md:flex items-center justify-center pointer-events-none p-3 select-none z-40 ${className}`}
    >
      {/* Same proportions as the Studio save form: neutral container, one pink CTA */}
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-2xl bg-base-300/90 p-1.5 border border-base-content/12 shadow-xl backdrop-blur-md">
        {/* Mode Switcher Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-label="Mode Switcher"
            aria-expanded={dropdownOpen}
            className="btn btn-ghost btn-sm h-9 min-h-9 rounded-xl px-3 font-black text-xs gap-1.5 text-base-content/70 hover:text-base-content hover:bg-base-200 cursor-pointer"
          >
            <Icon icon={PencilSimple} size="xs" />
            <span>Editing</span>
            <Icon
              icon={CaretUp}
              size="xs"
              className={`transition-transform duration-200 opacity-70 ${
                dropdownOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {dropdownOpen && (
            <div
              role="menu"
              aria-label="Mode Options"
              className={`absolute bottom-full left-0 mb-2 z-50 w-44 ${DROPDOWN_MENU}`}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className={DROPDOWN_ITEM(true)}
              >
                <Icon icon={PencilSimple} size="xs" />
                <span className="grow text-left">Editing</span>
                <Icon icon={Check} size="xs" />
              </button>

              <button
                type="button"
                role="menuitem"
                onClick={handleNavigateStudio}
                className={DROPDOWN_ITEM(false)}
              >
                <Icon icon={Sparkle} size="xs" />
                <span className="grow text-left">Studio</span>
                <Icon icon={Check} size="xs" className="invisible" />
              </button>
            </div>
          )}
        </div>

        {/* Save & Export Button */}
        <button
          type="button"
          onClick={onOpenSave}
          aria-label="Save & Export"
          className="btn btn-primary btn-sm h-9 min-h-9 rounded-xl px-4 font-black text-xs gap-1.5 shadow-xs"
        >
          <Icon icon={FloppyDisk} size="sm" />
          <span>Save & Export</span>
        </button>
      </div>
    </div>
  )
}
