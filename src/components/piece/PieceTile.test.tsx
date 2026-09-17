import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi, afterEach } from "vitest"
import { pieces, replaceCatalog } from "../../data/catalog"
import { SLOT_LABEL } from "../../data/pieceTypes"
import { fixturePieces } from "../../data/catalogSeed"
import { AuthContext, AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { WardrobeProvider, useWardrobe } from "../../state/wardrobe"
import { LikesProvider } from "../../state/likes"
import { mockSupabaseFrom } from "../../test/supabaseMock"
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

  it("overlays the slot label as a colored fading badge on the media", () => {
    const piece = pieces[0]
    const host = renderTile(<PieceTile piece={piece} />)
    const badge = host.querySelector(".tile-badge") as HTMLElement
    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe(SLOT_LABEL[piece.slot])
    expect(badge.style.getPropertyValue("--badge-color")).toBeTruthy()
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
    const from = mockSupabaseFrom()
    from.on("wardrobe_items", (query) => {
      if (query.operation === "select") {
        return { data: [{ garment_id: piece.id }], error: null }
      }
      return { data: null, error: null }
    })
    from.on("garments", { data: [], error: { message: "skip remote catalog" } })

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
