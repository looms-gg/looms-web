import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WardrobeEmpty } from "./WardrobeEmpty"

const activeRoots: ReturnType<typeof createRoot>[] = []

afterEach(() => {
  for (const root of activeRoots) {
    try {
      root.unmount()
    } catch {}
  }
  activeRoots.length = 0
  document.body.innerHTML = ""
})

function renderEmpty(ui: React.ReactNode) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(<MemoryRouter>{ui}</MemoryRouter>)
  })
  return host
}

describe("WardrobeEmpty", () => {
  it("renders title, body, and a link CTA when to is set", () => {
    const host = renderEmpty(
      <WardrobeEmpty
        title="No looks yet"
        body="Wear a few layers in Studio and save the combo."
        to="/studio"
        cta="Open studio"
      />,
    )

    expect(host.textContent).toMatch(/No looks yet/)
    expect(host.textContent).toMatch(/Wear a few layers/)
    const link = host.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/studio")
    expect(link?.textContent).toMatch(/Open studio/)
    expect(host.querySelector("button")).toBeNull()
  })

  it("renders a button CTA and calls onClick when to is omitted", () => {
    const onClick = vi.fn()
    const host = renderEmpty(
      <WardrobeEmpty
        title="Sign in to view your creations"
        body="Log in or create an account."
        cta="Sign in"
        onClick={onClick}
      />,
    )

    expect(host.querySelector("a")).toBeNull()
    const button = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Sign in",
    ) as HTMLButtonElement
    expect(button).toBeTruthy()

    flushSync(() => {
      button.click()
    })
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
