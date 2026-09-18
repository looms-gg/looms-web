import { useCallback, useMemo, useState } from "react"
import type { EditorControls } from "./editorControls"

export type EditorColorsData = Pick<
  EditorControls,
  "primaryColor" | "secondaryColor" | "recentColors"
>

export interface EditorColorsState {
  data: EditorColorsData
  patch: (p: Partial<EditorColorsData>) => void
  setPrimaryColor: (c: string, record?: boolean) => void
  setSecondaryColor: (c: string) => void
  swapColors: () => void
  restore: (partial: Partial<EditorControls>) => void
}

function pushRecent(recent: string[], color: string): string[] {
  const clean = color.toLowerCase()
  return [clean, ...recent.filter((c) => c.toLowerCase() !== clean)].slice(0, 16)
}

export function useEditorColors(): EditorColorsState {
  const [data, setData] = useState<EditorColorsData>({
    primaryColor: "#3880ff",
    secondaryColor: "#ffffff",
    recentColors: ["#3880ff", "#ffffff", "#000000", "#e28b57", "#6b4c35", "#4a7c59"],
  })

  const patch = useCallback((p: Partial<EditorColorsData>) => {
    setData((prev) => ({ ...prev, ...p }))
  }, [])

  const setPrimaryColor = useCallback((c: string, record = true) => {
    setData((prev) => ({
      ...prev,
      primaryColor: c,
      ...(record && { recentColors: pushRecent(prev.recentColors, c) }),
    }))
  }, [])

  const setSecondaryColor = useCallback((c: string) => {
    setData((prev) => ({
      ...prev,
      secondaryColor: c,
      recentColors: pushRecent(prev.recentColors, c),
    }))
  }, [])

  const swapColors = useCallback(() => {
    setData((prev) => ({
      ...prev,
      primaryColor: prev.secondaryColor,
      secondaryColor: prev.primaryColor,
    }))
  }, [])

  // The draft restore skips empty recentColors so a partial draft never
  // wipes the seeded palette
  const restore = useCallback((partial: Partial<EditorControls>) => {
    const next: Partial<EditorColorsData> = {}
    if (partial.primaryColor !== undefined) next.primaryColor = partial.primaryColor
    if (partial.secondaryColor !== undefined) next.secondaryColor = partial.secondaryColor
    if (partial.recentColors && partial.recentColors.length > 0) {
      next.recentColors = partial.recentColors
    }
    setData((prev) => ({ ...prev, ...next }))
  }, [])

  return useMemo(
    () => ({ data, patch, setPrimaryColor, setSecondaryColor, swapColors, restore }),
    [data, patch, setPrimaryColor, setSecondaryColor, swapColors, restore],
  )
}
