import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons"
import { FaIcon } from "./FaIcon"
import { useTheme } from "../state/theme"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const light = theme === "looms-light"

  return (
    <button
      type="button"
      className="btn btn-ghost relative size-11 min-h-11 overflow-hidden rounded-full p-0"
      aria-label={light ? "Use dark theme" : "Use light theme"}
      aria-pressed={light}
      onClick={toggleTheme}
    >
      <span
        className={`absolute inset-0 grid place-items-center transition-[transform,opacity,filter] duration-300 ${
          light
            ? "scale-100 opacity-100 blur-none"
            : "pointer-events-none scale-[0.25] opacity-0 blur-[4px]"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <FaIcon icon={faMoon} className="size-4" />
      </span>
      <span
        className={`absolute inset-0 grid place-items-center transition-[transform,opacity,filter] duration-300 ${
          !light
            ? "scale-100 opacity-100 blur-none"
            : "pointer-events-none scale-[0.25] opacity-0 blur-[4px]"
        }`}
        style={{
          transitionTimingFunction: "cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        <FaIcon icon={faSun} className="size-4" />
      </span>
    </button>
  )
}
