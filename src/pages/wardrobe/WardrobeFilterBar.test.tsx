import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { WardrobeEmptyRack, WardrobeFilterBar } from "./WardrobeFilterBar"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("WardrobeFilterBar", () => {
  it("filters layers and updates search query", () => {
    const onSlot = vi.fn()
    const onQuery = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <WardrobeFilterBar
          slot="all"
          onSlot={onSlot}
          query=""
          onQuery={onQuery}
          listLabel="Filter by slot"
          searchLabel="Search clothing"
          searchPlaceholder="Search clothing..."
        />,
      )
    })

    const coat = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Coat",
    ) as HTMLButtonElement
    flushSync(() => {
      coat.click()
    })
    expect(onSlot).toHaveBeenCalledWith("coat")

    const search = host.querySelector('input[aria-label="Search clothing"]') as HTMLInputElement
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
    flushSync(() => {
      setter?.call(search, "neon")
      search.dispatchEvent(new Event("input", { bubbles: true }))
    })
    expect(onQuery).toHaveBeenCalledWith("neon")
  })
})

describe("WardrobeEmptyRack", () => {
  it("resets filters from the empty state", () => {
    const onReset = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <WardrobeEmptyRack body="No matches" onReset={onReset} />,
      )
    })
    flushSync(() => {
      ;(host.querySelector("button") as HTMLButtonElement).click()
    })
    expect(onReset).toHaveBeenCalled()
  })
})
