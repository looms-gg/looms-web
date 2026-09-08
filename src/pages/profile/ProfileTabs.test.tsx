import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { GarmentRow, LookRow } from "../../lib/supabase"
import { AuthProvider } from "../../state/auth"
import { LikesProvider } from "../../state/likes"
import type { LikedContent } from "./profileApi"
import { ProfileTabs } from "./ProfileTabs"

const emptyLiked: LikedContent = { order: [], garments: [], looks: [] }

const upload: GarmentRow = {
  id: "g1",
  user_id: "u1",
  name: "Neon Tee",
  description: null,
  layer: "top",
  category: "tops",
  texture_path: "u1/g1.png",
  texture_url: "https://example.test/g1.png",
  is_public: true,
  like_count: 0,
  created_at: "",
  updated_at: "",
} as GarmentRow

const look: LookRow = {
  id: "l1",
  user_id: "u1",
  name: "Plaza Fit",
  is_public: true,
  body_id: "body-1",
  body_hue: 0,
  model: "classic",
  stack: [],
  created_at: "",
  updated_at: "",
} as LookRow

function renderTabs(props: Partial<React.ComponentProps<typeof ProfileTabs>> = {}) {
  const onTab = vi.fn()
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <LikesProvider>
          <MemoryRouter>
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
          </MemoryRouter>
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
