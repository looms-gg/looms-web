import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi, afterEach } from "vitest"
import { pieces, replaceCatalog } from "../../data/catalog"
import { fixturePieces } from "../../data/catalogSeed"
import { AuthContext, AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { WardrobeProvider, useWardrobe } from "../../state/wardrobe"
import { LikesProvider } from "../../state/likes"
import { supabase } from "../../lib/supabase"
import { PieceTile } from "./PieceTile"

afterEach(() => {
  replaceCatalog(fixturePieces())
  vi.restoreAllMocks()
})

function renderTile(ui: React.ReactNode) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <CatalogProvider>
          <LikesProvider>
            <MemoryRouter>
              <WardrobeProvider>{ui}</WardrobeProvider>
            </MemoryRouter>
          </LikesProvider>
        </CatalogProvider>
      </AuthProvider>,
    )
  })
  return host
}

describe("PieceTile", () => {
  it("links to the piece page and maker profile", () => {
    const host = renderTile(<PieceTile piece={pieces[0]} />)
    expect(host.querySelector(`a[href="/piece/${pieces[0].id}"]`)).not.toBeNull()
    expect(host.querySelector(`a[href="/u/${pieces[0].maker}"]`)).not.toBeNull()
  })

  it("does not render a like button on tiles", () => {
    const host = renderTile(<PieceTile piece={pieces[0]} />)
    expect(host.querySelector('button[aria-label^="Like"]')).toBeNull()
    expect(host.querySelector('button[aria-label^="Unlike"]')).toBeNull()
  })

  it("opens auth when signed-out user clicks add to wardrobe", () => {
    let owned = false
    function Probe() {
      owned = useWardrobe().owns(pieces[0].id)
      return <PieceTile piece={pieces[0]} />
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <CatalogProvider>
            <LikesProvider>
              <MemoryRouter>
                <WardrobeProvider>
                  <Probe />
                </WardrobeProvider>
              </MemoryRouter>
            </LikesProvider>
          </CatalogProvider>
        </AuthProvider>,
      )
    })

    const button = host.querySelector("button[aria-label^='Add']") as HTMLButtonElement
    expect(button).not.toBeNull()
    flushSync(() => {
      button.click()
    })
    expect(owned).toBe(false)
    expect(document.body.textContent).toMatch(/sign in|log in|password/i)
  })

  it("hides action buttons when action is wear", () => {
    const host = renderTile(<PieceTile piece={pieces[0]} action="wear" />)
    expect(host.querySelector("button[title='Add to character']")).toBeNull()
    expect(host.querySelector("button[title='Add to wardrobe']")).toBeNull()
  })

  it("removes an owned piece via two-tap on the checkmark", async () => {
    const piece = pieces.find((p) => p.slot !== "eyes")!
    vi.spyOn(supabase, "from").mockImplementation((table: string) => {
      if (table === "wardrobe_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [{ garment_id: piece.id }],
                error: null,
              }),
            }),
          }),
          insert: vi.fn().mockResolvedValue({ error: null }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        } as never
      }
      return {
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: [], error: { message: "skip remote catalog" } }),
          }),
          eq: vi.fn().mockReturnValue({
            order: vi
              .fn()
              .mockResolvedValue({ data: [], error: { message: "skip remote catalog" } }),
            then: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      } as never
    })

    const signedInAuth = {
      user: { id: "user-a", email: "a@test.dev" },
      session: null,
      profile: { id: "user-a", username: "A" },
      avatarUrl: null,
      loading: false,
      emailVerified: true,
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
    } as never

    let session!: ReturnType<typeof useWardrobe>
    function Probe() {
      session = useWardrobe()
      return <PieceTile piece={piece} />
    }

    const host = document.createElement("div")
    const root = createRoot(host)
    flushSync(() => {
      root.render(
        <AuthContext.Provider value={signedInAuth}>
          <CatalogProvider>
            <LikesProvider>
              <MemoryRouter>
                <WardrobeProvider>
                  <Probe />
                </WardrobeProvider>
              </MemoryRouter>
            </LikesProvider>
          </CatalogProvider>
        </AuthContext.Provider>,
      )
    })

    await vi.waitFor(() => {
      expect(session.owns(piece.id)).toBe(true)
    })

    const checkBtn = host.querySelector(
      `[aria-label="Remove ${piece.name} from wardrobe"]`,
    ) as HTMLButtonElement
    expect(checkBtn).toBeTruthy()

    flushSync(() => {
      checkBtn.click()
    })
    expect(session.owns(piece.id)).toBe(true)

    const confirmBtn = host.querySelector(
      `[aria-label="Confirm removing ${piece.name} from wardrobe"]`,
    ) as HTMLButtonElement
    flushSync(() => {
      confirmBtn.click()
    })

    await vi.waitFor(() => {
      expect(session.owns(piece.id)).toBe(false)
    })
    root.unmount()
  })
})
