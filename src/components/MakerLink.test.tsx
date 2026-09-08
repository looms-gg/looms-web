import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { MakerLink } from "./MakerLink"

describe("MakerLink", () => {
  it("links to the profile route", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <MakerLink username="PixelWeaver" />
        </MemoryRouter>,
      )
    })
    const link = host.querySelector("a")
    expect(link?.getAttribute("href")).toBe("/u/PixelWeaver")
    expect(link?.getAttribute("title")).toBe("PixelWeaver")
    expect(link?.textContent).toContain("PixelWeaver")
  })
})
