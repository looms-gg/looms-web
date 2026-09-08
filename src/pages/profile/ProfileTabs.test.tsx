import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { GarmentRow, LookRow } from "../../lib/supabase"
import { AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { ClosetProvider } from "../../state/closet"
import { LikesProvider } from "../../state/likes"
import type { LikedContent } from "./profileApi"
import { ProfileTabs } from "./ProfileTabs"

const emptyLiked: LikedContent = { order: [], garments: [], looks: [] }

const upload: GarmentRow = {
  id: "g1",
  user_id: "u1",
  name: "Neon Tee",
  description: null,
  slot: "shirt",
  body_group: "torso",
  saved_count: 0,
  like_count: 0,
  added: Date.now(),
  covers: [],
  texture_url: "https://example.test/g1.png",
  is_public: true,
  tags: [],
  created_at: "",
}

const look: LookRow = {
  id: "l1",
  user_id: "u1",
  name: "Plaza Fit",
  description: "",
  visibility: "public",
  body_id: "body-1",
  body_hue: 0,
  model: "classic",
  stack: [],
  created_at: "",
  updated_at: "",
}

function renderTabs(props: Partial<React.ComponentProps<typeof ProfileTabs>> = {}) {
  const onTab = vi.fn()
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <LikesProvider>
          <CatalogProvider>
            <MemoryRouter>
              <ClosetProvider>
                <ProfileTabs
                  tab="uploads"
                  username="PixelWeaver"
                  uploads={[]}
                  looks={[]}
                  liked={emptyLiked}
                  canViewLikes
                  onTab={onTab}
                  {...props}
                />
              </ClosetProvider>
            </MemoryRouter>
          </CatalogProvider>
        </LikesProvider>
      </AuthProvider>,
    )
  })
  return { host, onTab }
}

describe("ProfileTabs", () => {
  it("shows Liked tab only when canViewLikes is true", () => {
    const visible = renderTabs({ canViewLikes: true })
    expect(visible.host.textContent).toMatch(/Liked/)

    const hidden = renderTabs({ canViewLikes: false })
    expect(hidden.host.textContent).not.toMatch(/Liked/)
  })

  it("switches tabs via the tablist", () => {
    const { host, onTab } = renderTabs({ tab: "uploads" })
    const looksTab = Array.from(host.querySelectorAll('[role="tab"]')).find(
      (el) => el.textContent === "Looks",
    ) as HTMLButtonElement
    flushSync(() => {
      looksTab.click()
    })
    expect(onTab).toHaveBeenCalledWith("looks")
  })

  it("renders empty copy and filled grids for uploads and looks", () => {
    const empty = renderTabs({ tab: "uploads", uploads: [] })
    expect(empty.host.textContent).toMatch(/No public pieces yet/)

    const withUpload = renderTabs({ tab: "uploads", uploads: [upload] })
    expect(withUpload.host.textContent).toContain("Neon Tee")

    const emptyLooks = renderTabs({ tab: "looks", looks: [] })
    expect(emptyLooks.host.textContent).toMatch(/No public looks yet/)

    const withLook = renderTabs({ tab: "looks", looks: [look] })
    expect(withLook.host.textContent).toContain("Plaza Fit")
  })
})
