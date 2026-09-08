import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces, upsertPiece } from "../data/catalog"
import { ClosetProvider } from "../state/closet"
import { AuthContext } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import * as catalogState from "../state/catalog"
import { LikesProvider } from "../state/likes"
import { PiecePage } from "./PiecePage"

vi.mock("../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

vi.mock("../components/iso/SkinStage", () => ({
  SkinStage: () => <div data-testid="mock-skin-stage" />,
}))

vi.mock("../components/piece/PieceComments", () => ({
  PieceComments: () => <div data-testid="mock-piece-comments" />,
}))

const activeRoots: ReturnType<typeof createRoot>[] = []

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

function stubAuth(userId: string | null) {
  return {
    user: userId ? { id: userId, email: "maker@test.dev" } : null,
    session: null,
    profile: userId ? { id: userId, username: "Maker" } : null,
    avatarUrl: null,
    loading: false,
    emailVerified: Boolean(userId),
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: () => {},
    dismissEmailVerify: () => {},
    resendConfirmation: async () => ({ error: null }),
    signInWithPassword: async () => ({ error: null }),
    signUpWithPassword: async () => ({ error: null }),
    signInWithOtp: async () => ({ error: null }),
    signOut: async () => ({ error: null }),
    updateProfile: async () => ({ error: null }),
    refreshProfile: async () => {},
    profileError: null,
    dismissProfileError: () => {},
  }
}

function renderPiece(
  initialEntry: { pathname: string; state?: { from?: string } } | string,
  userId: string | null = null,
) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthContext.Provider value={stubAuth(userId) as never}>
          <LikesProvider>
            <CatalogProvider>
              <ClosetProvider>
                <Routes>
                  <Route path="/piece/:id" element={<PiecePage />} />
                </Routes>
              </ClosetProvider>
            </CatalogProvider>
          </LikesProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  })
  return host
}

describe("PiecePage", () => {
  it("exports the piece screen", () => {
    expect(typeof PiecePage).toBe("function")
  })

  it("links back to Explore by default when no prior state exists", () => {
    const host = renderPiece(`/piece/${pieces[0].id}`)
    const backLink = host.querySelector("a")
    expect(backLink?.getAttribute("href")).toBe("/")
    expect(backLink?.textContent?.trim()).toBe("← Explore")
  })

  it("links back to Wardrobe with query when from state is wardrobe pieces", () => {
    const host = renderPiece({
      pathname: `/piece/${pieces[0].id}`,
      state: { from: "/wardrobe?tab=pieces" },
    })
    const backLink = host.querySelector("a")
    expect(backLink?.getAttribute("href")).toBe("/wardrobe?tab=pieces")
    expect(backLink?.textContent?.trim()).toBe("← Wardrobe")
  })

  it("renders the piece sheet with reveal targets", () => {
    const host = renderPiece(`/piece/${pieces[0].id}`)
    expect(host.querySelector(".piece-sheet")).toBeTruthy()
    expect(host.querySelector(".piece-preview")).toBeTruthy()
    expect(host.querySelectorAll(".piece-reveal").length).toBeGreaterThanOrEqual(4)
    expect(host.querySelector("h1")?.textContent).toBe(pieces[0].name)
  })

  it("shows PieceSkeleton while catalog is loading an unknown id", () => {
    vi.spyOn(catalogState, "useCatalog").mockReturnValue({
      pieces,
      loading: true,
      error: null,
      upsert: () => pieces,
      reload: async () => {},
    })

    const host = renderPiece("/piece/still-fetching")
    expect(host.querySelector('[aria-label="Loading piece"]')).toBeTruthy()
    expect(host.querySelectorAll(".profile-bone").length).toBeGreaterThan(0)
  })

  it("shows Edit for the garment creator only, pinned top-right", () => {
    upsertPiece({
      ...pieces[0],
      id: "creator-piece-1",
      name: "Creator coat",
      userId: "creator-1",
    })

    const creatorHost = renderPiece(`/piece/creator-piece-1`, "creator-1")
    const editBtn = [...creatorHost.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Edit Creator coat",
    )
    expect(editBtn).toBeTruthy()
    expect(editBtn?.className).toMatch(/absolute/)
    expect(editBtn?.className).toMatch(/right-3/)

    const otherHost = renderPiece(`/piece/creator-piece-1`, "other-user")
    const otherEdit = [...otherHost.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Edit Creator coat",
    )
    expect(otherEdit).toBeFalsy()

    const signedOutHost = renderPiece(`/piece/creator-piece-1`)
    const signedOutEdit = [...signedOutHost.querySelectorAll("button")].find(
      (b) => b.getAttribute("aria-label") === "Edit Creator coat",
    )
    expect(signedOutEdit).toBeFalsy()
  })

  it("opens the upload inspector when Edit is clicked", () => {
    upsertPiece({
      ...pieces[0],
      id: "creator-piece-2",
      name: "Edit me coat",
      userId: "creator-1",
    })

    const host = renderPiece(`/piece/creator-piece-2`, "creator-1")
    const editBtn = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Edit"),
    ) as HTMLButtonElement
    expect(editBtn).toBeTruthy()

    flushSync(() => {
      editBtn.click()
    })

    expect(host.querySelector('[role="dialog"]')).not.toBeNull()
    expect(host.querySelector("h2")?.textContent).toBe("Edit me coat")
    expect(host.textContent).toMatch(/Upload new version/)
  })

  it("opens auth when signed-out user clicks Add to wardrobe", () => {
    const host = renderPiece(`/piece/${pieces[0].id}`)
    const addBtn = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Add to wardrobe"),
    ) as HTMLButtonElement
    expect(addBtn).toBeTruthy()
    flushSync(() => {
      addBtn.click()
    })
    expect(document.body.textContent).toMatch(/sign in|log in|password/i)
  })
})
