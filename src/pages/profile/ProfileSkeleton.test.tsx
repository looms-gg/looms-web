import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "../../state/auth"
import { LikesProvider } from "../../state/likes"
import * as profileApi from "./profileApi"
import { ProfileSkeleton } from "./ProfileSkeleton"
import { ProfilePage } from "../ProfilePage"

describe("ProfileSkeleton", () => {
  it("mirrors profile layout with accessible loading status", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(<ProfileSkeleton />)
    })

    const status = host.querySelector('[role="status"]') as HTMLElement
    expect(status).toBeTruthy()
    expect(status.getAttribute("aria-busy")).toBe("true")
    expect(status.getAttribute("aria-label")).toBe("Loading profile")
    expect(host.querySelectorAll(".profile-bone").length).toBeGreaterThan(8)
    expect(host.querySelector(".rack-grid")).toBeTruthy()
    expect(host.querySelector(".rounded-full")).toBeTruthy()
  })
})

describe("ProfilePage loading", () => {
  it("shows the profile skeleton while fetching", async () => {
    let resolveProfile: (value: null) => void = () => {}
    vi.spyOn(profileApi, "fetchProfileByUsername").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve
        }),
    )

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <LikesProvider>
            <MemoryRouter initialEntries={["/u/loading-user"]}>
              <Routes>
                <Route path="/u/:username" element={<ProfilePage />} />
              </Routes>
            </MemoryRouter>
          </LikesProvider>
        </AuthProvider>,
      )
    })

    expect(host.querySelector('[aria-label="Loading profile"]')).toBeTruthy()
    expect(host.querySelectorAll(".profile-bone").length).toBeGreaterThan(0)

    flushSync(() => {
      resolveProfile(null)
    })

    await vi.waitFor(() => {
      expect(host.textContent).toMatch(/Profile not found/i)
    })
  })
})
