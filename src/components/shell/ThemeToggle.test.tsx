import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { ThemeProvider } from "../../state/theme"
import { ThemeToggle } from "./ThemeToggle"

describe("ThemeToggle", () => {
  it("announces the opposite theme", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>,
      )
    })
    const button = host.querySelector("button")
    expect(button?.getAttribute("aria-label")).toMatch(/theme/i)
  })
})
