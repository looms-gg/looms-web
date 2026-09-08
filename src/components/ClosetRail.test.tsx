import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { ClosetRail } from "./ClosetRail"

describe("ClosetRail", () => {
  it("lists sort options", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ClosetRail
          sort="Newest"
          layer="all"
          onSort={() => {}}
          onLayer={() => {}}
        />,
      )
    })
    expect(host.querySelector("aside.closet-rail")).not.toBeNull()
    expect(host.textContent).toMatch(/Newest/)
    expect(host.textContent).toMatch(/Trending/)
  })
})
