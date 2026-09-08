import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const THEMES = ["looms", "looms-light"] as const
export type ThemeName = (typeof THEMES)[number]

const STORAGE_KEY = "looms.theme"
const DARK_INK = "#131418"
const LIGHT_INK = "#f3f1f8"

export function applyTheme(theme: ThemeName) {
  document.documentElement.setAttribute("data-theme", theme)
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    theme === "looms-light" ? LIGHT_INK : DARK_INK,
  )
}

function readTheme(): ThemeName {
  try {
    const stored =
      localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("skinplex.theme")
    return parseTheme(stored)
  } catch {
    return "looms"
  }
}

export function parseTheme(stored: string | null): ThemeName {
  if (stored === "looms-light" || stored === "skinplex-light") return "looms-light"
  if (stored === "looms" || stored === "skinplex") return "looms"
  return "looms"
}

type ThemeContextValue = {
  theme: ThemeName
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(readTheme)

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* private mode */
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "looms" ? "looms-light" : "looms"))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used in ThemeProvider")
  return ctx
}
