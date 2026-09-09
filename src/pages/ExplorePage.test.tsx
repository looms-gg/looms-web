import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ExplorePage } from "./ExplorePage"
import { AuthProvider } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import { ClosetProvider } from "../state/closet"
import { LikesProvider } from "../state/likes"
import * as publicLooksModule from "../state/publicLooks"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("ExplorePage", () => {
  it("renders with Pieces active by default and switches to Looks on tab click", async () => {
    vi.spyOn(publicLooksModule, "fetchTrendingLooksPastDay").mockResolvedValue([])
    vi.spyOn(publicLooksModule, "fetchPublicLooksFeed").mockResolvedValue([
      {
        id: "look-test-1",
        userId: "u-test",
        name: "Neon Cyberpunk",
        description: "Glow in the dark outfit",
        visibility: "public",
        stack: ["ink-fall"],
        bodyId: "slate",
        bodyHue: 0,
        model: "classic",
        likeCount: 55,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        maker: "GlowMaster",
        makerAvatarUrl: null,
      },
    ])

    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <LikesProvider>
              <CatalogProvider>
                <ClosetProvider>
                  <MemoryRouter initialEntries={["/"]}>
                    <ExplorePage />
                  </MemoryRouter>
                </ClosetProvider>
              </CatalogProvider>
            </LikesProvider>
          </AuthProvider>,
        )
      })
      await Promise.resolve()
    })

    expect(host.textContent).toContain("Browse all pieces")
    expect(host.textContent).toContain("Pieces")
    expect(host.textContent).toContain("Looks")

    // Find Looks tab button and click it
    const looksTab = Array.from(host.querySelectorAll("button[role='tab']")).find(
      (b) => b.textContent?.includes("Looks"),
    ) as HTMLButtonElement | null
    expect(looksTab).not.toBeNull()

    await act(async () => {
      looksTab?.click()
      await Promise.resolve()
    })

    expect(host.textContent).toContain("Browse community looks")
  })
})
