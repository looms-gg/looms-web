import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces, replaceCatalog } from "../../data/catalog"
import { fixturePieces } from "../../data/catalogSeed"
import { AuthContext } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { WardrobeProvider, useWardrobe } from "../../state/wardrobe"
import { mockSupabaseFrom } from "../../test/supabaseMock"
import { WardrobePiecesPanel } from "./WardrobePiecesPanel"

vi.mock("../../components/iso/IsoThumb", () => ({
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
  document.body.innerHTML = ""
  replaceCatalog(fixturePieces())
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

function mockCloudSession(ownedIds: string[] = []) {
  const controller = mockSupabaseFrom()
  controller.on("wardrobe_items", (query) => {
    if (query.operation === "select") {
      return {
        data: ownedIds.map((garment_id) => ({ garment_id })),
        error: null,
      }
    }
    return { data: null, error: null }
  })
  controller.on("garments", { data: [], error: { message: "skip remote catalog" } })
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function renderPieces(options: { signedIn?: boolean; ownedIds?: string[] } = {}) {
  const { signedIn = false, ownedIds = [] } = options
  mockCloudSession(ownedIds)
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
      <MemoryRouter>
        {signedIn ? (
          <AuthContext.Provider value={signedInAuth}>
            <CatalogProvider>
              <WardrobeProvider>
                <Capture />
                <WardrobePiecesPanel />
              </WardrobeProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        ) : (
          <CatalogProvider>
            <WardrobeProvider>
              <WardrobePiecesPanel />
            </WardrobeProvider>
          </CatalogProvider>
        )}
      </MemoryRouter>,
    )
  })
  return { host, getSession: () => session }
}

describe("WardrobePiecesPanel", () => {
  it("shows empty CTA linking to explore when wardrobe has no owned pieces", () => {
    const { host } = renderPieces()
    expect(host.textContent).toMatch(/Wardrobe’s still empty/)
    expect(host.textContent).toMatch(/Explore pieces/)
    expect(host.querySelector("a")?.getAttribute("href")).toBe("/")
  })

  it("renders owned pieces with search and layer filters", async () => {
    const coat = pieces.find((p) => p.slot === "coat")!
    const shirt = pieces.find((p) => p.slot === "shirt")!
    expect(coat).toBeTruthy()
    expect(shirt).toBeTruthy()

    const { host, getSession } = renderPieces({
      signedIn: true,
      ownedIds: [coat.id, shirt.id],
    })
    await vi.waitFor(() => {
      expect(getSession().owns(coat.id)).toBe(true)
      expect(getSession().owns(shirt.id)).toBe(true)
    })

    expect(host.querySelector('input[aria-label="Search clothing"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Filter by layer"]')).not.toBeNull()
    expect(host.querySelector(`a[href="/piece/${coat.id}"]`)).not.toBeNull()
    expect(host.querySelector(`a[href="/piece/${shirt.id}"]`)).not.toBeNull()
    expect(host.textContent).toMatch(new RegExp(coat.name))
    expect(host.textContent).toMatch(new RegExp(shirt.name))
  })

  it("filters by layer and resets filters when the rack is empty", async () => {
    const coat = pieces.find((p) => p.slot === "coat")!
    const { host, getSession } = renderPieces({
      signedIn: true,
      ownedIds: [coat.id],
    })
    await vi.waitFor(() => {
      expect(getSession().owns(coat.id)).toBe(true)
    })

    const shirtPill = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Shirt",
    ) as HTMLButtonElement
    expect(shirtPill).toBeTruthy()
    flushSync(() => {
      shirtPill.click()
    })

    expect(host.textContent).toMatch(/Nothing in this rack/)
    const reset = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Reset filters",
    ) as HTMLButtonElement
    expect(reset).toBeTruthy()

    flushSync(() => {
      reset.click()
    })

    expect(host.textContent).toMatch(new RegExp(coat.name))
    expect(host.textContent).not.toMatch(/Nothing in this rack/)
  })

  it("filters by search query", async () => {
    const coat = pieces.find((p) => p.slot === "coat")!
    const shirt = pieces.find((p) => p.slot === "shirt")!
    const { host, getSession } = renderPieces({
      signedIn: true,
      ownedIds: [coat.id, shirt.id],
    })
    await vi.waitFor(() => {
      expect(getSession().owns(coat.id)).toBe(true)
    })

    const search = host.querySelector(
      'input[aria-label="Search clothing"]',
    ) as HTMLInputElement
    flushSync(() => {
      setInputValue(search, coat.name)
    })

    expect(host.querySelector(`a[href="/piece/${coat.id}"]`)).not.toBeNull()
    expect(host.querySelector(`a[href="/piece/${shirt.id}"]`)).toBeNull()
  })

  it("removes a piece from the wardrobe via two-tap confirm", async () => {
    const coat = pieces.find((p) => p.slot === "coat")!
    const { host, getSession } = renderPieces({
      signedIn: true,
      ownedIds: [coat.id],
    })
    await vi.waitFor(() => {
      expect(getSession().owns(coat.id)).toBe(true)
    })
    expect(host.textContent).toMatch(new RegExp(coat.name))

    const removeBtn = host.querySelector(
      `[aria-label="Remove ${coat.name} from wardrobe"]`,
    ) as HTMLButtonElement
    expect(removeBtn).toBeTruthy()

    // First tap arms confirmation; piece stays.
    flushSync(() => {
      removeBtn.click()
    })
    expect(getSession().owns(coat.id)).toBe(true)

    // Second tap confirms removal.
    const confirmBtn = host.querySelector(
      `[aria-label="Confirm removing ${coat.name} from wardrobe"]`,
    ) as HTMLButtonElement
    expect(confirmBtn).toBeTruthy()
    flushSync(() => {
      confirmBtn.click()
    })

    await vi.waitFor(() => {
      expect(getSession().owns(coat.id)).toBe(false)
    })
    expect(host.textContent).toMatch(/Wardrobe’s still empty/)
  })
})
