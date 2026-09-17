import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LatestActivityFeed } from "./LatestActivityFeed"
import * as reportsApi from "../../lib/reports"

const cleanupList: { root: ReturnType<typeof createRoot>; host: HTMLElement }[] = []

async function renderFeed() {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => {
    flushSync(() => {
      root.render(
        <MemoryRouter>
          <LatestActivityFeed />
        </MemoryRouter>,
      )
    })
    await new Promise((r) => setTimeout(r, 0))
  })
  cleanupList.push({ host, root })
  return host
}

describe("LatestActivityFeed", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(reportsApi, "adminDeleteContent").mockResolvedValue(undefined)
  })

  afterEach(() => {
    for (const { root, host } of cleanupList.splice(0)) {
      flushSync(() => {
        root.unmount()
      })
      host.remove()
    }
  })

  it("renders the empty state when the feed has no rows", async () => {
    vi.spyOn(reportsApi, "fetchRecentPlatformActivity").mockResolvedValue({
      looks: [],
      pieces: [],
      comments: [],
      profiles: [],
    })

    const host = await renderFeed()

    expect(host.textContent).toMatch(/Nothing to review yet/)
    expect(host.textContent).not.toMatch(/Latest Looks/)
  })

  it("renders malformed rows with empty strings and invalid dates without crashing", async () => {
    vi.spyOn(reportsApi, "fetchRecentPlatformActivity").mockResolvedValue({
      looks: [
        {
          id: "look-1",
          user_id: "user-1",
          name: "",
          description: "",
          visibility: "public",
          stack: [],
          body_id: "classic",
          body_hue: 0,
          model: "classic",
          created_at: "not-a-date",
          updated_at: "not-a-date",
        },
      ] as unknown as reportsApi.RecentActivityFeed["looks"],
      pieces: [
        {
          id: "piece-1",
          name: "",
          slot: "shirt",
          created_at: "not-a-date",
        },
      ] as unknown as reportsApi.RecentActivityFeed["pieces"],
      comments: [
        {
          id: "comment-1",
          targetType: "look",
          targetId: "look-1",
          userId: "user-2",
          body: "",
          createdAt: "not-a-date",
        },
      ],
      profiles: [
        {
          id: "profile-1",
          username: "",
          created_at: "not-a-date",
        },
      ] as unknown as reportsApi.RecentActivityFeed["profiles"],
    })

    const host = await renderFeed()

    expect(host.textContent).toMatch(/Latest Looks \(1\)/)
    expect(host.textContent).toMatch(/Latest Pieces \(1\)/)
    expect(host.textContent).toMatch(/Latest Comments \(1\)/)
    expect(host.textContent).toMatch(/Latest Profiles \(1\)/)
  })
})
