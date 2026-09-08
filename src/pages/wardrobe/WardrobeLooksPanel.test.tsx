import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ClosetProvider, type Look } from "../../state/closet"
import { WardrobeLooksPanel } from "./WardrobeLooksPanel"

vi.mock("../../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

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

const rainDay: Look = {
  id: "look-1",
  name: "Rain day",
  description: "Wet streets",
  visibility: "private",
  equipped: { coat: "winter-coat" },
  stack: ["winter-coat"],
  bodyId: "body-4",
  bodyHue: 0,
  model: "classic",
  savedAt: Date.now(),
}

const storm: Look = {
  id: "look-2",
  name: "Storm",
  description: "",
  visibility: "private",
  equipped: {},
  stack: [],
  bodyId: "body-4",
  bodyHue: 0,
  model: "classic",
  savedAt: Date.now(),
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function renderLooks(looks: Look[]) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(
      <MemoryRouter>
        <ClosetProvider>
          <WardrobeLooksPanel looks={looks} />
        </ClosetProvider>
      </MemoryRouter>,
    )
  })
  return host
}

describe("WardrobeLooksPanel", () => {
  it("shows empty CTA linking to studio when there are no looks", () => {
    const host = renderLooks([])
    expect(host.textContent).toMatch(/No looks yet/)
    expect(host.textContent).toMatch(/Open studio/)
    expect(host.querySelector("a")?.getAttribute("href")).toBe("/studio")
  })

  it("renders a looks grid with search when looks exist", () => {
    const host = renderLooks([rainDay, storm])

    expect(host.textContent).toMatch(/2 looks/)
    expect(host.querySelector('input[aria-label="Search looks"]')).not.toBeNull()
    expect(host.textContent).toMatch(/Rain day/)
    expect(host.textContent).toMatch(/Storm/)
    expect(host.querySelectorAll('[data-testid="mock-iso-thumb"]').length).toBe(2)
  })

  it("filters looks and resets search when nothing matches", () => {
    const host = renderLooks([rainDay, storm])

    const search = host.querySelector(
      'input[aria-label="Search looks"]',
    ) as HTMLInputElement
    flushSync(() => {
      setInputValue(search, "zzzz-no-match")
    })

    expect(host.textContent).toMatch(/No looks match/)
    const reset = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Reset search",
    ) as HTMLButtonElement
    expect(reset).toBeTruthy()

    flushSync(() => {
      reset.click()
    })

    expect(host.textContent).toMatch(/Rain day/)
    expect(host.textContent).toMatch(/Storm/)
    expect(host.textContent).not.toMatch(/No looks match/)
  })

  it("opens the look inspector from a tile", () => {
    const host = renderLooks([rainDay])

    const tile = [...host.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-pressed") != null && b.textContent?.includes("Rain day"),
    ) as HTMLButtonElement
    expect(tile).toBeTruthy()

    flushSync(() => {
      tile.click()
    })

    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    expect(host.querySelector("h2")?.textContent).toBe("Rain day")
  })
})
