import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { replaceCatalog, type Piece } from "../../data/catalog"
import { fixturePieces } from "../../data/catalogSeed"
import { AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { ClosetProvider } from "../../state/closet"
import { WardrobeFilteredRack } from "./WardrobeFilteredRack"

vi.mock("../../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
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
  replaceCatalog(fixturePieces())
})

const coat: Piece = {
  id: "rack-coat-1",
  name: "Rack coat",
  slot: "coat",
  group: "torso",
  maker: "Maker",
  savedCount: 0,
  likeCount: 0,
  added: 1700000000000,
  blurb: "Coat",
  skin: "data:image/png;base64,aa",
}

const shirt: Piece = {
  id: "rack-shirt-1",
  name: "Rack shirt",
  slot: "shirt",
  group: "torso",
  maker: "Maker",
  savedCount: 0,
  likeCount: 0,
  added: 1700000000001,
  blurb: "Shirt",
  skin: "data:image/png;base64,bb",
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function renderRack(pieces: Piece[]) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(
      <MemoryRouter>
        <AuthProvider>
          <CatalogProvider>
            <ClosetProvider>
              <WardrobeFilteredRack
                pieces={pieces}
                listLabel="Filter by layer"
                searchLabel="Search clothing"
                searchPlaceholder="Search clothing..."
                emptyFilterCopy="No owned pieces match the selected filter."
              />
            </ClosetProvider>
          </CatalogProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
  })
  return host
}

describe("WardrobeFilteredRack", () => {
  it("renders search, layer filters, and tiles", () => {
    const host = renderRack([coat, shirt])

    expect(host.querySelector('input[aria-label="Search clothing"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Filter by layer"]')).not.toBeNull()
    expect(host.textContent).toMatch(/Rack coat/)
    expect(host.textContent).toMatch(/Rack shirt/)
  })

  it("shows empty rack copy and resets filters", () => {
    const host = renderRack([coat])

    const shirtPill = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Shirt",
    ) as HTMLButtonElement
    flushSync(() => {
      shirtPill.click()
    })

    expect(host.textContent).toMatch(/Nothing in this rack/)
    expect(host.textContent).toMatch(/No owned pieces match the selected filter/)

    const reset = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Reset filters",
    ) as HTMLButtonElement
    flushSync(() => {
      reset.click()
    })

    expect(host.textContent).toMatch(/Rack coat/)
    expect(host.textContent).not.toMatch(/Nothing in this rack/)
  })

  it("filters by search query", () => {
    const host = renderRack([coat, shirt])
    const search = host.querySelector(
      'input[aria-label="Search clothing"]',
    ) as HTMLInputElement
    flushSync(() => {
      setInputValue(search, "coat")
    })

    expect(host.textContent).toMatch(/Rack coat/)
    expect(host.textContent).not.toMatch(/Rack shirt/)
  })
})
