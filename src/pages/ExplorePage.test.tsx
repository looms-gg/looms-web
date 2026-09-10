import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ExplorePage } from "./ExplorePage"
import { AuthProvider } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import { WardrobeProvider } from "../state/wardrobe"
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
                <WardrobeProvider>
                  <MemoryRouter initialEntries={["/"]}>
                    <ExplorePage />
                  </MemoryRouter>
                </WardrobeProvider>
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
  it("shows the yesterday's #1 crown badge in the hero when fetchYesterdayTopLook resolves", async () => {
    const champion: publicLooksModule.PublicLook = {
      id: "look-yay",
      userId: "u-yay",
      name: "Yesterday's Champion",
      description: "Won the day",
      visibility: "public",
      stack: ["ink-fall"],
      bodyId: "slate",
      bodyHue: 0,
      model: "classic",
      likeCount: 120,
      createdAt: Date.now() - 1000 * 60 * 60 * 36,
      updatedAt: Date.now() - 1000 * 60 * 60 * 36,
      maker: "ChampMaker",
      makerAvatarUrl: null,
    }

    vi.spyOn(publicLooksModule, "fetchTrendingLooksPastDay").mockResolvedValue(
      publicLooksModule.DEFAULT_FEATURED_LOOKS,
    )
    vi.spyOn(publicLooksModule, "fetchPublicLooksFeed").mockResolvedValue([])
    vi.spyOn(publicLooksModule, "fetchYesterdayTopLook").mockResolvedValue(champion)

    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <LikesProvider>
              <CatalogProvider>
                <WardrobeProvider>
                  <MemoryRouter initialEntries={["/"]}>
                    <ExplorePage />
                  </MemoryRouter>
                </WardrobeProvider>
              </CatalogProvider>
            </LikesProvider>
          </AuthProvider>,
        )
      })
      // flush async fetches
      await Promise.resolve()
      await Promise.resolve()
    })

    const badge = Array.from(host.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Yesterday's #1"),
    )
    expect(badge).toBeTruthy()
    expect(badge?.textContent).toContain("Yesterday's Champion")
  })
})
