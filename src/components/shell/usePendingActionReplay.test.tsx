import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { WardrobeProvider } from "../../state/wardrobe"
import { LikesProvider } from "../../state/likes"
import { supabase } from "../../lib/supabase"
import {
  clearPendingAction,
  peekPendingAction,
  setPendingAction,
} from "../../lib/pendingAction"
import { usePendingActionReplay } from "./usePendingActionReplay"

const activeRoots: ReturnType<typeof createRoot>[] = []

beforeEach(() => {
  sessionStorage.clear()
  clearPendingAction()
  vi.spyOn(supabase, "from").mockImplementation(() => {
    // Every chained method returns the same thenable that resolves to an
    // empty success payload — satisfies every query shape used by providers.
    const chain = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      single: () => Promise.resolve({ data: null, error: null }),
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        Promise.resolve({ data: [], error: null }).then(resolve),
    }
    return chain as never
  })
})

afterEach(() => {
  for (const root of activeRoots) {
    try {
      root.unmount()
    } catch {
      /* ignore */
    }
  }
  activeRoots.length = 0
  document.body.innerHTML = ""
  vi.restoreAllMocks()
})

function stubAuth(userId: string | null, verified = true): AuthContextValue {
  return {
    user: userId ? ({ id: userId, email: "newbie@test.dev" } as AuthContextValue["user"]) : null,
    session: userId ? ({} as AuthContextValue["session"]) : null,
    profile: userId ? ({ id: userId, username: "Newbie" } as AuthContextValue["profile"]) : null,
    avatarUrl: null,
    loading: false,
    emailVerified: verified,
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: vi.fn(),
    dismissEmailVerify: vi.fn(),
    resendConfirmation: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
    profileError: null,
    dismissProfileError: vi.fn(),
    deleteAccount: vi.fn(),
  }
}

function Probe({ path }: { path: { current: string } }) {
  const location = useLocation()
  path.current = location.pathname
  return null
}

function Harness({ path }: { auth: AuthContextValue; path: { current: string } }) {
  usePendingActionReplay()
  return (
    <Routes>
      <Route path="/piece/:id" element={<Probe path={path} />} />
      <Route path="/studio" element={<Probe path={path} />} />
      <Route path="*" element={<Probe path={path} />} />
    </Routes>
  )
}

function renderReplayHarness(auth: AuthContextValue, path: { current: string }) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  act(() => {
    flushSync(() => {
      root.render(
        <AuthContext.Provider value={auth}>
          <LikesProvider>
            <CatalogProvider>
              <WardrobeProvider>
                <MemoryRouter initialEntries={["/piece/winter-coat"]}>
                  <Harness auth={auth} path={path} />
                </MemoryRouter>
              </WardrobeProvider>
            </CatalogProvider>
          </LikesProvider>
        </AuthContext.Provider>,
      )
    })
  })
  return { host, root }
}

async function reAuth(
  root: ReturnType<typeof createRoot>,
  auth: AuthContextValue,
  path: { current: string },
) {
  await act(async () => {
    flushSync(() => {
      root.render(
        <AuthContext.Provider value={auth}>
          <LikesProvider>
            <CatalogProvider>
              <WardrobeProvider>
                <MemoryRouter initialEntries={["/piece/winter-coat"]}>
                  <Harness auth={auth} path={path} />
                </MemoryRouter>
              </WardrobeProvider>
            </CatalogProvider>
          </LikesProvider>
        </AuthContext.Provider>,
      )
    })
    await Promise.resolve()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("usePendingActionReplay", () => {
  it("replays openStudio by navigating to /studio on login", async () => {
    setPendingAction({ action: "openStudio" })
    const path = { current: "/piece/winter-coat" }
    const { root } = renderReplayHarness(stubAuth(null), path)

    await reAuth(root, stubAuth("user-9"), path)

    expect(path.current).toBe("/studio")
    expect(peekPendingAction()).toBeNull()
  })

  it("replays add by consuming the envelope without navigation", async () => {
    setPendingAction({ action: "add", pieceId: "winter-coat" })
    const path = { current: "/piece/winter-coat" }
    const { root } = renderReplayHarness(stubAuth(null), path)

    await reAuth(root, stubAuth("user-9"), path)

    expect(path.current).toBe("/piece/winter-coat")
    expect(peekPendingAction()).toBeNull()
  })

  it("replays on the verification flip (unverified → verified)", async () => {
    setPendingAction({ action: "openStudio" })
    const path = { current: "/piece/winter-coat" }
    const { root } = renderReplayHarness(stubAuth("user-9", false), path)

    await reAuth(root, stubAuth("user-9", true), path)

    expect(path.current).toBe("/studio")
    expect(peekPendingAction()).toBeNull()
  })

  it("does not replay while the session is still unverified", async () => {
    setPendingAction({ action: "openStudio" })
    const path = { current: "/piece/winter-coat" }
    const { root } = renderReplayHarness(stubAuth(null), path)

    await reAuth(root, stubAuth("user-9", false), path)

    expect(path.current).toBe("/piece/winter-coat")
    expect(peekPendingAction()).not.toBeNull()
  })

  it("replays on first mount with a session (magic-link landing)", async () => {
    setPendingAction({ action: "openStudio" })
    const path = { current: "/piece/winter-coat" }
    renderReplayHarness(stubAuth("user-9"), path)

    expect(path.current).toBe("/studio")
    expect(peekPendingAction()).toBeNull()
  })

  it("does nothing when no action is pending", async () => {
    const path = { current: "/piece/winter-coat" }
    const { root } = renderReplayHarness(stubAuth(null), path)

    await reAuth(root, stubAuth("user-9"), path)

    expect(path.current).toBe("/piece/winter-coat")
  })

  it("clears the pending action on sign-out without replaying", async () => {
    const path = { current: "/piece/winter-coat" }
    const { root } = renderReplayHarness(stubAuth("user-9"), path)
    setPendingAction({ action: "openStudio" })

    await reAuth(root, stubAuth(null), path)

    expect(path.current).toBe("/piece/winter-coat")
    expect(peekPendingAction()).toBeNull()
  })
})
