import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LookPage } from "./LookPage"
import { AuthContext, type AuthContextValue } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import { WardrobeProvider } from "../state/wardrobe"
import { LikesProvider } from "../state/likes"
import { supabase } from "../lib/supabase"
import * as publicLooksModule from "../state/publicLooks"
import { peekPendingAction, clearPendingAction } from "../lib/pendingAction"

const activeRoots: ReturnType<typeof createRoot>[] = []

beforeEach(() => {
  sessionStorage.clear()
  clearPendingAction()
  vi.spyOn(supabase, "from").mockImplementation(() => {
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

function stubAuth(userId: string | null): AuthContextValue {
  return {
    user: userId
      ? ({ id: userId, email: "wearer@test.dev" } as AuthContextValue["user"])
      : null,
    session: userId ? ({} as AuthContextValue["session"]) : null,
    profile: userId
      ? ({ id: userId, username: "Wearer" } as AuthContextValue["profile"])
      : null,
    avatarUrl: null,
    loading: false,
    emailVerified: Boolean(userId),
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

function mockPublicLook() {
  vi.spyOn(publicLooksModule, "fetchLookById").mockResolvedValue({
    id: "look-winter",
    userId: "u-snow",
    name: "Blizzard Scout",
    description: "Ready for frosty mountains",
    visibility: "public",
    stack: ["ink-fall", "winter-coat"],
    bodyId: "slate",
    bodyHue: 0,
    model: "classic",
    likeCount: 88,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    maker: "SnowyPlayer",
    makerAvatarUrl: null,
  })
}

async function renderLook(userId: string | null) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  await act(async () => {
    flushSync(() => {
      root.render(
        <AuthContext.Provider value={stubAuth(userId)}>
          <LikesProvider>
            <CatalogProvider>
              <WardrobeProvider>
                <MemoryRouter initialEntries={["/look/look-winter"]}>
                  <Routes>
                    <Route path="/look/:id" element={<LookPage />} />
                    <Route path="/studio" element={<div data-testid="studio-dest" />} />
                  </Routes>
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
  return host
}

describe("LookPage", () => {
  it("renders look details, maker, layer breakdown, and comments", async () => {
    mockPublicLook()
    const host = await renderLook(null)

    expect(host.textContent).toContain("Blizzard Scout")
    expect(host.textContent).toContain("SnowyPlayer")
    expect(host.textContent).toContain("Ready for frosty mountains")
    expect(host.textContent).toContain("Wear in Studio")
    expect(host.textContent).toContain("Download Skin")
    expect(host.textContent).toMatch(/Outfit Layers/i)
    expect(host.textContent).toMatch(/Comments/i)
  })

  it("stores a wearLook envelope and opens auth when a guest clicks Wear in Studio", async () => {
    mockPublicLook()
    const host = await renderLook(null)

    const wearBtn = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Wear in Studio"),
    ) as HTMLButtonElement
    expect(wearBtn).toBeTruthy()

    await act(async () => {
      flushSync(() => {
        wearBtn.click()
      })
    })

    expect(peekPendingAction()).toMatchObject({
      action: "wearLook",
      lookId: "look-winter",
    })
    expect(document.body.textContent).toMatch(/sign in|log in|password/i)
  })

  it("does not store an envelope for signed-in users clicking Wear in Studio", async () => {
    mockPublicLook()
    const host = await renderLook("user-2")

    const wearBtn = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Wear in Studio"),
    ) as HTMLButtonElement
    expect(wearBtn).toBeTruthy()

    await act(async () => {
      flushSync(() => {
        wearBtn.click()
      })
    })

    expect(peekPendingAction()).toBeNull()
  })
})
