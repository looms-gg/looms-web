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
})
