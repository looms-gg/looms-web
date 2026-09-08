import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { RACK_GRID_CLASS, RackGrid } from "./RackGrid"

describe("RackGrid", () => {
  it("applies the shared Closet column and gap classes", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <RackGrid>
          <span>tile</span>
        </RackGrid>,
      )
    })
    const el = host.firstElementChild as HTMLElement
    expect(el.tagName).toBe("DIV")
    expect(el.className.split(/\s+/)).toEqual(
      expect.arrayContaining(RACK_GRID_CLASS.split(/\s+/)),
    )
    expect(el.textContent).toBe("tile")
  })

  it("merges an optional className after the base classes", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<RackGrid className="mt-2">x</RackGrid>)
    })
    const el = host.firstElementChild as HTMLElement
    expect(el.className).toBe(`${RACK_GRID_CLASS} mt-2`)
  })
})
