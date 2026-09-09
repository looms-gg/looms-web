import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { ThemeProvider, useTheme } from "./theme"

describe("ThemeProvider", () => {
  it("setTheme applies the theme and persists it", () => {
    let ctx!: ReturnType<typeof useTheme>
    function Catcher() {
      ctx = useTheme()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ThemeProvider>
          <Catcher />
        </ThemeProvider>,
      )
    })

    flushSync(() => {
      ctx.setTheme("looms-light")
    })

    expect(ctx.theme).toBe("looms-light")
    expect(document.documentElement.getAttribute("data-theme")).toBe("looms-light")
    expect(localStorage.getItem("looms.theme")).toBe("looms-light")

    flushSync(() => {
      ctx.setTheme("looms")
    })
    expect(document.documentElement.getAttribute("data-theme")).toBe("looms")
  })
})
