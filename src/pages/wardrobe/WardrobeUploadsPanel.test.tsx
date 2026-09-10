import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { type Piece } from "../../data/catalog"
import { WardrobeProvider } from "../../state/wardrobe"
import { CatalogProvider } from "../../state/catalog"
import { LikesProvider } from "../../state/likes"
import { AuthProvider } from "../../state/auth"
import { WardrobeUploadsPanel } from "./WardrobeUploadsPanel"

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
})

const coatUpload: Piece = {
  id: "upload-coat-1",
  name: "My upload coat",
  slot: "coat",
  group: "torso",
  maker: "Maker",
  savedCount: 0,
  likeCount: 0,
  added: 1700000000000,
  blurb: "Custom coat",
  skin: "data:image/png;base64,aa",
  userId: "creator-1",
  isPublic: false,
}

const shirtUpload: Piece = {
  id: "upload-shirt-1",
  name: "My upload shirt",
  slot: "shirt",
  group: "torso",
  maker: "Maker",
  savedCount: 0,
  likeCount: 0,
  added: 1700000000001,
  blurb: "Custom shirt",
  skin: "data:image/png;base64,bb",
  userId: "creator-1",
  isPublic: true,
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

function renderUploads(props: {
  user: { id: string }
  myUploads?: Piece[]
  onUpload?: () => void
}) {
  const host = document.createElement("div")
  const root = createRoot(host)
  activeRoots.push(root)
  flushSync(() => {
    root.render(
      <MemoryRouter>
        <AuthProvider>
        <LikesProvider>
        <CatalogProvider>
        <WardrobeProvider>
          <WardrobeUploadsPanel
            user={props.user}
            myUploads={props.myUploads ?? []}
            onUpload={props.onUpload ?? (() => {})}
          />
        </WardrobeProvider>
        </CatalogProvider>
        </LikesProvider>
        </AuthProvider>
      </MemoryRouter>,
    )
  })
  return host
}

describe("WardrobeUploadsPanel", () => {
  it("shows empty upload CTA when signed in with no uploads", () => {
    const onUpload = vi.fn()
    const host = renderUploads({ user: { id: "creator-1" }, onUpload })

    expect(host.textContent).toMatch(/No uploads yet/)
    const button = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Upload piece",
    ) as HTMLButtonElement
    expect(button).toBeTruthy()

    flushSync(() => {
      button.click()
    })
    expect(onUpload).toHaveBeenCalledTimes(1)
  })

  it("renders an uploads grid with search and layer filters", () => {
    const host = renderUploads({
      user: { id: "creator-1" },
      myUploads: [coatUpload, shirtUpload],
    })

    expect(host.querySelector('input[aria-label="Search uploads"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Filter uploads by layer"]')).not.toBeNull()
    expect(host.textContent).toMatch(/My upload coat/)
    expect(host.textContent).toMatch(/My upload shirt/)
  })

  it("filters by layer and resets filters when nothing matches", () => {
    const host = renderUploads({
      user: { id: "creator-1" },
      myUploads: [coatUpload],
    })

    const shirtPill = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Shirt",
    ) as HTMLButtonElement
    flushSync(() => {
      shirtPill.click()
    })

    expect(host.textContent).toMatch(/Nothing in this rack/)
    const reset = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Reset filters",
    ) as HTMLButtonElement
    flushSync(() => {
      reset.click()
    })

    expect(host.textContent).toMatch(/My upload coat/)
    expect(host.textContent).not.toMatch(/Nothing in this rack/)
  })

  it("filters uploads by search query", () => {
    const host = renderUploads({
      user: { id: "creator-1" },
      myUploads: [coatUpload, shirtUpload],
    })

    const search = host.querySelector(
      'input[aria-label="Search uploads"]',
    ) as HTMLInputElement
    flushSync(() => {
      setInputValue(search, "coat")
    })

    expect(host.textContent).toMatch(/My upload coat/)
    expect(host.textContent).not.toMatch(/My upload shirt/)
  })
})
