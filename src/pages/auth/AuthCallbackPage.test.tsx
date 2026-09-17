import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { supabase } from "../../lib/supabase"
import { OAUTH_RETURN_KEY } from "../../lib/auth/oauth"
import { AuthCallbackPage } from "./AuthCallbackPage"

function LocationCatcher({ onLocation }: { onLocation: (path: string) => void }) {
  const location = useLocation()
  onLocation(location.pathname + location.search)
  return null
}

function mountPage(onLocation: (path: string) => void, entry = "/auth/callback") {
  const host = document.createElement("div")
  document.body.appendChild(host)
  flushSync(() => {
    createRoot(host).render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<LocationCatcher onLocation={onLocation} />} />
        </Routes>
      </MemoryRouter>,
    )
  })
  return host
}

describe("AuthCallbackPage", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it("shows a friendly message and no raw provider error text", async () => {
    const host = mountPage(() => {}, "/auth/callback?error=access_denied&error_description=raw%20details")
    await act(async () => {
      await Promise.resolve()
    })
    flushSync(() => {})
    expect(host.textContent).toContain("didn't finish")
    expect(host.textContent).not.toContain("raw details")
  })

  it("navigates to the stashed return path once a session exists", async () => {
    window.localStorage.setItem(OAUTH_RETURN_KEY, "/studio")
    let navigatedTo = ""
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as never)
    mountPage((path) => {
      navigatedTo = path
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(navigatedTo).toBe("/studio")
    expect(window.localStorage.getItem(OAUTH_RETURN_KEY)).toBeNull()
  })
})
