import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ExploreHero } from "./ExploreHero"
import type { PublicLook } from "../../state/publicLooks"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("ExploreHero", () => {
  const topLooks: PublicLook[] = [
    {
      id: "look-1",
      userId: "u1",
      name: "Solar Knight",
      description: "Glowing solar armor",
      visibility: "public",
      stack: ["cape", "armor"],
      bodyId: "slate",
      bodyHue: 0,
      model: "classic",
      likeCount: 99,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maker: "SunWarrior",
      makerAvatarUrl: null,
      recentLikeCount: 25,
    },
    {
      id: "look-2",
      userId: "u2",
      name: "Moon Rogue",
      description: "Stealthy shadows",
      visibility: "public",
      stack: ["cloak", "boots"],
      bodyId: "ash",
      bodyHue: 0,
      model: "slim",
      likeCount: 75,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maker: "ShadowWeaver",
      makerAvatarUrl: null,
      recentLikeCount: 18,
    },
    {
      id: "look-3",
      userId: "u3",
      name: "Forest Druid",
      description: "Leafy moss robes",
      visibility: "public",
      stack: ["robe", "staff"],
      bodyId: "sand",
      bodyHue: 120,
      model: "classic",
      likeCount: 50,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      maker: "GreenThumb",
      makerAvatarUrl: null,
      recentLikeCount: 12,
    },
  ]

  it("renders the 3 look names and creator links above heads", async () => {
    const host = document.createElement("div")

    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <MemoryRouter>
            <ExploreHero
              trendingLooks={topLooks}
            />
          </MemoryRouter>,
        )
      })
    })

    expect(host.textContent).toContain("Solar Knight")
    expect(host.textContent).toContain("Moon Rogue")
    expect(host.textContent).toContain("Forest Druid")
    expect(host.textContent).toContain("SunWarrior")
    expect(host.textContent).toContain("ShadowWeaver")
    expect(host.textContent).toContain("GreenThumb")

    // Verify it does not have wear, ranking badges, or inspect buttons
    expect(host.textContent).not.toMatch(/#1 Trending/i)
    expect(host.textContent).not.toContain("Wear #1 Look")
    expect(host.querySelector("button[data-action='wear-look-1']")).toBeNull()

    // Verify links to look pages exist
    const links = Array.from(host.querySelectorAll("a[href^='/look/']"))
    expect(links.length).toBeGreaterThan(0)

    // Verify Join Discord CTA
    const discordLink = host.querySelector("a[href='https://discord.gg/UNTRgHBBPb']")
    expect(discordLink).not.toBeNull()
    expect(discordLink?.textContent).toContain("Join Discord")
  })

  it("renders skeleton placeholders when loading is true", async () => {
    const host = document.createElement("div")

    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <MemoryRouter>
            <ExploreHero loading={true} />
          </MemoryRouter>,
        )
      })
    })

    const skeletons = host.querySelectorAll(".skin-bone")
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })
})

