import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { StudioCollection } from "./StudioCollection"
import { emptyOwnedBySlot } from "./studioOwned"
import type { Piece } from "../../data/catalog"

vi.mock("../../components/iso/IsoThumb", () => ({
  IsoThumb: ({ piece }: { piece: Piece }) => (
    <div data-testid={`mock-iso-thumb-${piece.id}`}>{piece.name}</div>
  ),
}))

const testShirt: Piece = {
  id: "test-shirt-1",
  name: "Vintage Plaid",
  slot: "shirt",
  group: "torso",
  maker: "Tester",
  savedCount: 10,
  likeCount: 5,
  added: 1234,
  blurb: "A nice shirt",
  skin: "data:image/png;base64,test",
}

const testHat: Piece = {
  id: "test-hat-1",
  name: "Fedora",
  slot: "hat",
  group: "head",
  maker: "Tester",
  savedCount: 2,
  likeCount: 1,
  added: 1234,
  blurb: "A cool hat",
  skin: "data:image/png;base64,test",
}

describe("StudioCollection", () => {
  it("renders Collection panel title and vertical category rail", () => {
    const host = document.createElement("div")
    const onCategory = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={2}
            ownedBySlot={{
              ...emptyOwnedBySlot(),
              shirt: [testShirt],
              hat: [testHat],
            }}
            racks={["shirt", "hat"]}
            category="all"
            onCategory={onCategory}
            equipped={{}}
            onWear={vi.fn()}
            onClear={vi.fn()}
          />
        </MemoryRouter>,
      )
    })

    // Outer group and inner rail + wardrobe panel structure
    expect(host.querySelector(".studio-collection-group")).toBeTruthy()
    const rail = host.querySelector(".studio-category-rail")
    expect(rail).toBeTruthy()
    const wardrobe = host.querySelector(".studio-wardrobe")
    expect(wardrobe).toBeTruthy()

    expect(wardrobe?.textContent).toContain("Collection")

    // Check that rail buttons exist in order: All, Hat, Eyes, Shirt
    const tabs = rail?.querySelectorAll('button') ?? []
    expect(tabs.length).toBe(4)
    const tabLabels = Array.from(tabs).map((btn) => btn.textContent?.trim())
    expect(tabLabels).toEqual(["All", "Hat", "Eyes", "Shirt"])

    const allTab = tabs[0] as HTMLButtonElement
    const shirtTab = tabs[3] as HTMLButtonElement

    expect(allTab).toBeTruthy()
    expect(shirtTab).toBeTruthy()

    expect(allTab.getAttribute("aria-selected")).toBe("true")
    expect(shirtTab.getAttribute("aria-selected")).toBe("false")

    flushSync(() => {
      shirtTab.click()
    })
    expect(onCategory).toHaveBeenCalledWith("shirt")
  })

  it("renders a unified grid without slot separation in All view and equips on click", () => {
    const host = document.createElement("div")
    const onWear = vi.fn()
    const onClear = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={2}
            ownedBySlot={{
              ...emptyOwnedBySlot(),
              shirt: [testShirt],
              hat: [testHat],
            }}
            racks={["shirt", "hat"]}
            category="all"
            onCategory={vi.fn()}
            equipped={{}}
            onWear={onWear}
            onClear={onClear}
          />
        </MemoryRouter>,
      )
    })

    // Both shirt and hat appear in the grid
    expect(host.textContent).toContain("Vintage Plaid")
    expect(host.textContent).toContain("Fedora")

    // Renders all pieces in a single continuous grid (only 1 grid element)
    const grids = host.querySelectorAll(".studio-wardrobe-list .grid")
    expect(grids.length).toBe(1)

    // No uppercase slot header labels separating the types
    const slotHeaders = host.querySelectorAll(".studio-wardrobe-list p.uppercase.text-xs")
    expect(slotHeaders.length).toBe(0)

    // Clicking unworn shirt equips it
    const card = host.querySelector('button[aria-label="Wear Vintage Plaid"]') as HTMLButtonElement
    expect(card).toBeTruthy()
    // Cards have edge-to-edge media area and lower brow for info
    const media = card.querySelector(".studio-piece-media")
    expect(media).toBeTruthy()
    const brow = card.querySelector(".studio-piece-brow")
    expect(brow).toBeTruthy()
    expect(brow?.textContent).toContain("Vintage Plaid")
    expect(brow?.textContent).toContain("Shirt")

    flushSync(() => {
      card.click()
    })
    expect(onWear).toHaveBeenCalledWith("test-shirt-1")
  })

  it("shows Worn badge when piece is equipped, and clicking takes it off", () => {
    const host = document.createElement("div")
    const onClear = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={1}
            ownedBySlot={{
              ...emptyOwnedBySlot(),
              shirt: [testShirt],
            }}
            racks={["shirt"]}
            category="shirt"
            onCategory={vi.fn()}
            equipped={{ shirt: "test-shirt-1" }}
            onWear={vi.fn()}
            onClear={onClear}
          />
        </MemoryRouter>,
      )
    })

    const card = host.querySelector('button[aria-label="Take off Vintage Plaid"]') as HTMLButtonElement
    expect(card).toBeTruthy()
    expect(card.textContent).toContain("Worn")

    flushSync(() => {
      card.click()
    })
    expect(onClear).toHaveBeenCalledWith("shirt")
  })

  it("renders empty state with Explore link and without Appearance button", () => {
    const host = document.createElement("div")

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={0}
            ownedBySlot={emptyOwnedBySlot()}
            racks={[]}
            category="all"
            onCategory={vi.fn()}
            equipped={{}}
            onWear={vi.fn()}
            onClear={vi.fn()}
          />
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toContain("Wardrobe's still empty.")
    expect(host.textContent).toContain("Explore pieces")
    expect(host.textContent).not.toContain("Appearance")
  })

  it("shows a per-category empty state when the selected slot has no pieces", () => {
    const host = document.createElement("div")

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={1}
            ownedBySlot={{
              ...emptyOwnedBySlot(),
              hat: [testHat],
            }}
            racks={["shirt", "hat"]}
            category="shirt"
            onCategory={vi.fn()}
            equipped={{}}
            onWear={vi.fn()}
            onClear={vi.fn()}
          />
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toContain("No shirt here yet.")
    expect(host.textContent).toContain("Find pieces in Explore.")
    expect(host.textContent).toContain("Explore pieces")
    expect(host.querySelector(".border-dashed")).toBeTruthy()
  })

  it("renders eyes category with default card, eye presets, and contextual eye height dock", () => {
    const host = document.createElement("div")
    const onWear = vi.fn()
    const onClear = vi.fn()
    const onEyeOffset = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={0}
            ownedBySlot={emptyOwnedBySlot()}
            racks={[]}
            category="eyes"
            onCategory={vi.fn()}
            equipped={{ eyes: "eye-05@-1" }}
            equippedEyes="eye-05@-1"
            eyeOffset={-1}
            onWear={onWear}
            onClear={onClear}
            onEyeOffset={onEyeOffset}
          />
        </MemoryRouter>,
      )
    })

    // Should render Default none card
    expect(host.textContent).toContain("Default")

    // Should render bundled eye cards (e.g. Eyes #01, Eyes #05)
    expect(host.textContent).toContain("Eyes #01")
    expect(host.textContent).toContain("Eyes #05")

    // Eye 05 is equipped, so its card should show Worn
    const eye05Card = host.querySelector('button[aria-label="Take off Eyes #05"]') as HTMLButtonElement
    expect(eye05Card).toBeTruthy()

    // Eye height dock should be visible because category is eyes and eyes are equipped
    const eyeDock = host.querySelector(".studio-eye-dock")
    expect(eyeDock).toBeTruthy()
    expect(eyeDock?.textContent).toContain("Eye height")
    expect(eyeDock?.textContent).toContain("Up 1")

    // Reset button
    const resetBtn = eyeDock?.querySelector('button[aria-label="Reset eye height"]') as HTMLButtonElement
    expect(resetBtn).toBeTruthy()
    flushSync(() => {
      resetBtn.click()
    })
    expect(onEyeOffset).toHaveBeenCalledWith(0)
  })

  it("sorts category rail in strict order: All, Hat, Hair, Eyes, Shirt, Coat, Pants, Shoes, Set", () => {
    const host = document.createElement("div")
    const testHair: Piece = { ...testHat, id: "hair-1", slot: "hair", name: "Curly Hair" }
    const testCoat: Piece = { ...testShirt, id: "coat-1", slot: "coat", name: "Winter Coat" }
    const testPants: Piece = { ...testShirt, id: "pants-1", slot: "pants", name: "Jeans" }
    const testShoes: Piece = { ...testShirt, id: "shoes-1", slot: "shoes", name: "Boots" }
    const testSet: Piece = { ...testShirt, id: "set-1", slot: "set", name: "Armor Set" }

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioCollection
            ownedCount={7}
            ownedBySlot={{
              ...emptyOwnedBySlot(),
              hair: [testHair],
              hat: [testHat],
              shirt: [testShirt],
              coat: [testCoat],
              pants: [testPants],
              shoes: [testShoes],
              set: [testSet],
            }}
            racks={["hair", "hat", "shirt", "coat", "pants", "shoes", "set"]}
            category="all"
            onCategory={vi.fn()}
            equipped={{}}
            onWear={vi.fn()}
            onClear={vi.fn()}
          />
        </MemoryRouter>,
      )
    })

    const buttons = host.querySelectorAll(".studio-category-rail button")
    const labels = Array.from(buttons).map((btn) => btn.textContent?.trim())
    expect(labels).toEqual([
      "All",
      "Hat",
      "Hair",
      "Eyes",
      "Shirt",
      "Coat",
      "Pants",
      "Shoes",
      "Set",
    ])
  })
})
