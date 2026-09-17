import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { ExploreRail } from "./ExploreRail"

describe("ExploreRail", () => {
  it("lists sort options", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ExploreRail
          sort="Newest"
          slot="all"
          onSort={() => {}}
          onSlot={() => {}}
        />,
      )
    })
    expect(host.querySelector("aside.explore-rail")).not.toBeNull()
    expect(host.textContent).toMatch(/Newest/)
    expect(host.textContent).toMatch(/Trending/)
  })
})
