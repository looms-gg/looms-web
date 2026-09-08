import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { LookPage } from "./LookPage"
import { AuthProvider } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import { ClosetProvider } from "../state/closet"
import { LikesProvider } from "../state/likes"
import * as publicLooksModule from "../state/publicLooks"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("LookPage", () => {
  it("renders look details, maker, layer breakdown, and comments", async () => {
    vi.spyOn(publicLooksModule, "fetchLookById").mockResolvedValue({
      id: "look-winter",
      userId: "u-snow",
      name: "Blizzard Scout",
      description: "Ready for frosty mountains",
      visibility: "public",
      stack: ["ink-fall", "winter-coat"],
      bodyId: "slate",
      bodyHue: 0,
      model: "classic",
      likeCount: 88,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maker: "SnowyPlayer",
      makerAvatarUrl: null,
    })

    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <LikesProvider>
              <CatalogProvider>
                <ClosetProvider>
                  <MemoryRouter initialEntries={["/look/look-winter"]}>
                    <Routes>
                      <Route path="/look/:id" element={<LookPage />} />
                    </Routes>
                  </MemoryRouter>
                </ClosetProvider>
              </CatalogProvider>
            </LikesProvider>
          </AuthProvider>,
        )
      })
      await Promise.resolve()
    })

    expect(host.textContent).toContain("Blizzard Scout")
    expect(host.textContent).toContain("SnowyPlayer")
    expect(host.textContent).toContain("Ready for frosty mountains")
    expect(host.textContent).toContain("Wear in Studio")
    expect(host.textContent).toContain("Download Skin")
    expect(host.textContent).toMatch(/Outfit Layers/i)
    expect(host.textContent).toMatch(/Comments/i)
  })
})
