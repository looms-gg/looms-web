import { describe, expect, it, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { EditorQuickPalette } from "./EditorQuickPalette"
import { PICKER_PRESETS } from "./tools/colorModel"
import type { SkinEditorState } from "./useSkinEditor"

describe("EditorQuickPalette", () => {
  it("renders one swatch per preset and selects on click", () => {
    const setPrimaryColor = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorQuickPalette
          editor={{ colors: { data: { primaryColor: "#3880ff" }, setPrimaryColor } } as any}
        />,
      )
    })

    const swatches = Array.from(
      host.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    )
    expect(swatches).toHaveLength(PICKER_PRESETS.length)
    expect(swatches[0].getAttribute("aria-selected")).toBe("false")

    flushSync(() => swatches[3].click())
    expect(setPrimaryColor).toHaveBeenCalledWith(PICKER_PRESETS[3])
  })

  it("marks the current color as selected", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <EditorQuickPalette
          editor={{ colors: { data: { primaryColor: PICKER_PRESETS[1] }, setPrimaryColor: vi.fn() } } as unknown as SkinEditorState}
        />,
      )
    })
    const swatches = Array.from(
      host.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    )
    expect(swatches[1].getAttribute("aria-selected")).toBe("true")
    expect(swatches[0].getAttribute("aria-selected")).toBe("false")
  })
})
