import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces, upsertPiece } from "../data/catalog"
import { WardrobeProvider, useWardrobe } from "../state/wardrobe"
import { AuthContext } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import { mockSupabaseFrom } from "../test/supabaseMock"
import { WardrobePage } from "./WardrobePage"

vi.mock("../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

const activeRoots: ReturnType<typeof createRoot>[] = []

afterEach(() => {
  for (const root of activeRoots) {
    try {
      root.unmount()
    } catch {}
  }
  activeRoots.length = 0
  vi.restoreAllMocks()
})

const signedInAuth = {
  user: { id: "user-a", email: "a@test.dev" },
  session: null,
  profile: { id: "user-a", username: "A" },
  avatarUrl: null,
  loading: false,
  emailVerified: true,
  pendingEmail: null,
  resendConfirmation: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signUpWithPassword: async () => ({ error: null }),
  signInWithOtp: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
  updateProfile: async () => ({ error: null }),
  refreshProfile: async () => {},
} as never

function mockCloudSession() {
  mockSupabaseFrom()
}

function renderWardrobe(path = "/wardrobe", authValue: unknown = signedInAuth) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <AuthContext.Provider value={authValue as never}>
          <CatalogProvider>
            <WardrobeProvider>
              <WardrobePage />
            </WardrobeProvider>
          </CatalogProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  })
  return host
}

function PathPeek() {
  const loc = useLocation()
  return <span data-testid="path">{loc.pathname}</span>
}

function lookTileLink(host: HTMLElement, name: string) {
  return [...host.querySelectorAll("a")].find(
    (a) => a.getAttribute("href")?.startsWith("/look/") && a.textContent?.includes(name),
  ) as HTMLAnchorElement
}

function renderWardrobeWithLooks(...names: string[]) {
  mockCloudSession()
  let session!: ReturnType<typeof useWardrobe>
  function Capture() {
    session = useWardrobe()
    return null
  }
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(
      <MemoryRouter initialEntries={["/wardrobe?tab=looks"]}>
        <AuthContext.Provider value={signedInAuth}>
          <CatalogProvider>
            <WardrobeProvider>
              <Capture />
              <WardrobePage />
              <PathPeek />
            </WardrobeProvider>
          </CatalogProvider>
        </AuthContext.Provider>
      </MemoryRouter>,
    )
  })
  flushSync(() => {
    for (const name of names) session.saveLook(name)
  })
  return host
}

describe("WardrobePage", () => {
  it("shows pieces empty state by default", () => {
    const host = renderWardrobe()
    expect(host.textContent).toMatch(/Wardrobe/)
    expect(host.textContent).toMatch(/Saved characters and pieces you own/)
    expect(host.textContent).toMatch(/Explore pieces/)
  })

  it("shows looks empty state on ?tab=looks", () => {
    const host = renderWardrobe("/wardrobe?tab=looks")
    expect(host.textContent).toMatch(/No looks yet/)
    expect(host.querySelector("a")?.getAttribute("href")).toBe("/studio")
  })

  it("shows pieces empty state on ?tab=pieces", () => {
    const host = renderWardrobe("/wardrobe?tab=pieces")
    expect(host.textContent).toMatch(/Wardrobe/)
    expect(host.textContent).toMatch(/Explore pieces/)
  })

  it("switches tabs via the tablist", () => {
    const host = renderWardrobe()
    const piecesTab = [...host.querySelectorAll("button")].find((el) =>
      el.textContent?.includes("Pieces"),
    ) as HTMLButtonElement
    flushSync(() => {
      piecesTab.click()
    })
    expect(host.textContent).toMatch(/Wardrobe/)
  })

  it("links a look tile to the look page", () => {
    const host = renderWardrobeWithLooks("Rain day")

    const link = lookTileLink(host, "Rain day")
    expect(link).toBeTruthy()
    expect(link.getAttribute("href")).toMatch(/^\/look\//)
  })

  it("navigates to the look page from a look tile", async () => {
    const host = renderWardrobeWithLooks("Rain day")

    const link = lookTileLink(host, "Rain day")
    await act(async () => {
      link.click()
    })

    expect(host.querySelector('[data-testid="path"]')?.textContent).toMatch(/^\/look\//)
  })

  it("never shows a Wear this control on look tiles", () => {
    const host = renderWardrobeWithLooks("Rain day")
    expect(host.textContent).not.toMatch(/Wear this/)
  })

  it("renders pieces tab with search, slot pills, and wear tile actions", async () => {
    mockSupabaseFrom()

    let session!: ReturnType<typeof useWardrobe>
    function Capture() {
      session = useWardrobe()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=pieces"]}>
          <AuthContext.Provider
            value={
              {
                user: { id: "user-a", email: "a@test.dev" },
                session: null,
                profile: { id: "user-a", username: "A" },
                avatarUrl: null,
                loading: false,
                emailVerified: true,
                pendingEmail: null,
                resendConfirmation: async () => ({ error: null }),
                signInWithPassword: async () => ({ error: null }),
                signUpWithPassword: async () => ({ error: null }),
                signInWithOtp: async () => ({ error: null }),
                signOut: async () => ({ error: null }),
                updateProfile: async () => ({ error: null }),
                refreshProfile: async () => {},
              } as never
            }
          >
            <CatalogProvider><WardrobeProvider>
              <Capture />
              <WardrobePage />
              <PathPeek />
            </WardrobeProvider></CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })
    flushSync(() => {
      session.addToWardrobe(pieces[0].id)
    })
    await vi.waitFor(() => {
      expect(session.owns(pieces[0].id)).toBe(true)
    })

    const searchInput = host.querySelector('input[aria-label="Search clothing"]')
    expect(searchInput).not.toBeNull()

    const allPill = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "All",
    )
    expect(allPill).toBeTruthy()

    const pieceLink = host.querySelector(`a[href="/piece/${pieces[0].id}"]`)
    expect(pieceLink).not.toBeNull()
    expect(host.querySelector(`button[aria-label^="Add "]`)).toBeNull()
    expect(host.querySelector('[data-testid="path"]')?.textContent).toBe("/wardrobe")
  })

  it("shows empty uploads state when user is signed in with no uploads", () => {
    const authValue = {
      user: { id: "new-user-no-uploads", email: "user@test.dev" },
      session: null,
      profile: { id: "new-user-no-uploads", username: "Newbie" },
      avatarUrl: null,
      loading: false,
      emailVerified: true,
      pendingEmail: null,
      resendConfirmation: async () => ({ error: null }),
      signInWithPassword: async () => ({ error: null }),
      signUpWithPassword: async () => ({ error: null }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      updateProfile: async () => ({ error: null }),
      refreshProfile: async () => {},
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={authValue as never}>
            <CatalogProvider><WardrobeProvider>
              <WardrobePage />
            </WardrobeProvider></CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toMatch(/No uploads yet/)
    expect(host.textContent).toMatch(/Upload piece/)
  })

  it("links upload tiles to the piece listing page", () => {
    upsertPiece({
      ...pieces[0],
      id: "wardrobe-upload-1",
      name: "My upload coat",
      userId: "creator-1",
      isPublic: false,
    })

    const authValue = {
      user: { id: "creator-1", email: "maker@test.dev" },
      session: null,
      profile: { id: "creator-1", username: "Maker" },
      avatarUrl: null,
      loading: false,
      emailVerified: true,
      pendingEmail: null,
      resendConfirmation: async () => ({ error: null }),
      signInWithPassword: async () => ({ error: null }),
      signUpWithPassword: async () => ({ error: null }),
      signInWithOtp: async () => ({ error: null }),
      signOut: async () => ({ error: null }),
      updateProfile: async () => ({ error: null }),
      refreshProfile: async () => {},
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={authValue as never}>
            <CatalogProvider><WardrobeProvider>
              <WardrobePage />
            </WardrobeProvider></CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    const pieceLink = host.querySelector('a[href="/piece/wardrobe-upload-1"]')
    expect(pieceLink).not.toBeNull()
    expect(host.textContent).toMatch(/My upload coat/)
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  })
})
