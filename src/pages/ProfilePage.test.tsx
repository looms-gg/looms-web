import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { AuthProvider } from "../state/auth"
import { LikesProvider } from "../state/likes"
import * as profileApi from "./profile/profileApi"
import { ProfilePage } from "./ProfilePage"

describe("ProfilePage", () => {
  it("shows not found when the username is missing", async () => {
    vi.spyOn(profileApi, "fetchProfileByUsername").mockResolvedValue(null)

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <LikesProvider>
            <MemoryRouter initialEntries={["/u/missing-user"]}>
              <Routes>
                <Route path="/u/:username" element={<ProfilePage />} />
              </Routes>
            </MemoryRouter>
          </LikesProvider>
        </AuthProvider>,
      )
    })

    await vi.waitFor(() => {
      expect(host.textContent).toMatch(/Profile not found/i)
    })
  })

  it("renders profile details and creations when loaded successfully", async () => {
    const mockProfile = {
      id: "user-123",
      username: "PixelCrafter",
      bio: "Crafting fine pixel clothing",
      avatar_url: null,
      banner_url: null,
      discord: "pixelcrafter#1234",
      minecraft_username: "PixelCrafter",
      github: "pixelcrafter",
      created_at: new Date().toISOString(),
      show_likes: true,
      role: "user" as const,
      notify_likes: true,
      notify_comments: true,
      notify_replies: true,
      last_seen_at: null,
      show_last_seen: false,
      username_changed_at: null,
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    }

    vi.spyOn(profileApi, "fetchProfileByUsername").mockResolvedValue(mockProfile)
    vi.spyOn(profileApi, "fetchPublicUploads").mockResolvedValue([])
    vi.spyOn(profileApi, "fetchPublicLooks").mockResolvedValue([])
    vi.spyOn(profileApi, "fetchLikedContent").mockResolvedValue({
      garments: [],
      looks: [],
      order: [],
    })

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <LikesProvider>
            <MemoryRouter initialEntries={["/u/PixelCrafter"]}>
              <Routes>
                <Route path="/u/:username" element={<ProfilePage />} />
              </Routes>
            </MemoryRouter>
          </LikesProvider>
        </AuthProvider>,
      )
    })

    await vi.waitFor(() => {
      expect(host.textContent).toContain("PixelCrafter")
      expect(host.textContent).toContain("Crafting fine pixel clothing")
    })
  })
})

