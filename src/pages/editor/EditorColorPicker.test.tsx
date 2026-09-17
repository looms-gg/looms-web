import React from "react"
import ReactDOM from "react-dom/client"
import { act } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { EditorColorPicker } from "./EditorColorPicker"
import { PICKER_PRESETS } from "./tools/colorModel"

describe("EditorColorPicker", () => {
  let host: HTMLDivElement | null = null
  let root: ReactDOM.Root | null = null

  afterEach(() => {
    if (root && host) {
      act(() => {
        root?.unmount()
      })
    }
    root = null
    host?.remove()
    host = null
  })

  function mount(props: React.ComponentProps<typeof EditorColorPicker>) {
    host = document.createElement("div")
    document.body.appendChild(host)
    root = ReactDOM.createRoot(host)
    act(() => {
      root?.render(<EditorColorPicker {...props} />)
    })
    return host
  }

  it("renders palette and supports preset click as commit", () => {
    const onChange = vi.fn()
    mount({ color: "#3880ff", onChange })
    const buttons = Array.from(host!.querySelectorAll("button"))
    const preset = buttons.find(
      (b) => b.getAttribute("aria-label") === `Use preset color ${PICKER_PRESETS[0]}`,
    )
    expect(preset).toBeTruthy()
    act(() => {
      preset!.click()
    })
    expect(onChange).toHaveBeenCalledWith(PICKER_PRESETS[0], "commit")
  })

  it("syncs when the color prop changes externally", async () => {
    mount({ color: "#3880ff", onChange: vi.fn() })
    await act(async () => {
      root?.render(
        <EditorColorPicker color="#ff0000" onChange={() => {}} />,
      )
    })
    const text = host!.querySelector<HTMLInputElement>('input[aria-label="Hex color"]')
    expect(text?.value).toBe("ff0000")
  })

  it("creates the two slider fields and hue/box canvases", () => {
    mount({ color: "#123456", onChange: vi.fn() })
    expect(host!.querySelector('[role="slider"][aria-label="Hue"]')).toBeTruthy()
    expect(host!.querySelector('[aria-label="Saturation and brightness"]')).toBeTruthy()
    expect(host!.querySelectorAll("canvas").length).toBeGreaterThanOrEqual(2)
  })
})
