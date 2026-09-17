import { act } from "react"
import { createRoot } from "react-dom/client"
import { describe, expect, it, vi } from "vitest"
import { StudioAssembly } from "./StudioAssembly"
import { bodies } from "../../data/bodies"
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

describe("StudioAssembly", () => {
  it("renders Layers title, caption, model switch, and reveals body tones and slider via carat", () => {
    const host = document.createElement("div")
    const onModel = vi.fn()
    const onPickTone = vi.fn()
    const onBodyHue = vi.fn()

    act(() => {
      createRoot(host).render(
        <StudioAssembly
          body={bodies[0]}
          bodies={bodies}
          bodyTint="#f5bda3"
          bodyHue={15}
          model="classic"
          stackTopFirst={[testHat, testShirt]}
          onModel={onModel}
          onMove={vi.fn()}
          onReorder={vi.fn()}
          onClear={vi.fn()}
          onPickTone={onPickTone}
          onBodyHue={onBodyHue}
        />,
      )
    })

    expect(host.textContent).toContain("Assembly")
    expect(host.textContent).toContain("Drag and reorder layers to prioritize elements.")
    expect(host.textContent).toContain("Classic")
    expect(host.textContent).toContain("Slim")

    // Layers rows
    expect(host.textContent).toContain("Fedora")
    expect(host.textContent).toContain("Vintage Plaid")

    // Pinned body summary row is visible with body name
    expect(host.textContent).toContain("Fair")

    // Initially collapsed: Hue Shift slider and swatches are hidden
    const toggleBtn = host.querySelector("button.studio-stack-body") as HTMLButtonElement
    expect(toggleBtn).toBeTruthy()
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false")
    expect(host.textContent).not.toContain("Hue Shift")
    expect(host.querySelector(".studio-tones")).toBeNull()

    // Clicking the carat / body toggle button reveals the tones and slider
    act(() => {
      toggleBtn.click()
    })
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("true")
    expect(host.textContent).toContain("Hue Shift")
    expect(host.textContent).toContain("+15")

    // Clicking a body swatch calls onPickTone
    const secondTone = host.querySelector(`button[aria-label="${bodies[1].name}"]`) as HTMLButtonElement
    expect(secondTone).toBeTruthy()
    act(() => {
      secondTone.click()
    })
    expect(onPickTone).toHaveBeenCalledWith(bodies[1].id)

    // Reset hue button is present and works
    const resetHueBtn = host.querySelector('button[aria-label="Reset hue"]') as HTMLButtonElement
    expect(resetHueBtn).toBeTruthy()
    act(() => {
      resetHueBtn.click()
    })
    expect(onBodyHue).toHaveBeenCalledWith(0)

    // Clicking the body toggle button again collapses the section
    act(() => {
      toggleBtn.click()
    })
    expect(toggleBtn.getAttribute("aria-expanded")).toBe("false")
    expect(host.textContent).not.toContain("Hue Shift")
    expect(host.querySelector(".studio-tones")).toBeNull()
  })

  it("reorders layers via keyboard navigation on the drag handle", () => {
    const host = document.createElement("div")
    const onMove = vi.fn()

    act(() => {
      createRoot(host).render(
        <StudioAssembly
          body={bodies[0]}
          bodies={bodies}
          bodyTint="#f5bda3"
          bodyHue={0}
          model="classic"
          stackTopFirst={[testHat, testShirt]}
          onModel={vi.fn()}
          onMove={onMove}
          onReorder={vi.fn()}
          onClear={vi.fn()}
          onPickTone={vi.fn()}
          onBodyHue={vi.fn()}
        />,
      )
    })

    const dragHandle = host.querySelector('button[aria-label^="Reorder Fedora"]') as HTMLButtonElement
    expect(dragHandle).toBeTruthy()

    // Press ArrowDown to move inside; fires exactly once (grip must not bubble to row)
    dragHandle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }))
    expect(onMove).toHaveBeenCalledTimes(1)
    expect(onMove).toHaveBeenCalledWith("test-hat-1", -1)

    // Press ArrowUp to move outside, again exactly once
    dragHandle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }))
    expect(onMove).toHaveBeenCalledTimes(2)
    expect(onMove).toHaveBeenNthCalledWith(2, "test-hat-1", 1)
  })

  it("takes off layer when X button is clicked", () => {
    const host = document.createElement("div")
    const onClear = vi.fn()

    act(() => {
      createRoot(host).render(
        <StudioAssembly
          body={bodies[0]}
          bodies={bodies}
          bodyTint="#f5bda3"
          bodyHue={0}
          model="classic"
          stackTopFirst={[testHat]}
          onModel={vi.fn()}
          onMove={vi.fn()}
          onReorder={vi.fn()}
          onClear={onClear}
          onPickTone={vi.fn()}
          onBodyHue={vi.fn()}
        />,
      )
    })

    const dropBtn = host.querySelector('button[aria-label="Take off Fedora"]') as HTMLButtonElement
    expect(dropBtn).toBeTruthy()
    act(() => {
      dropBtn.click()
    })
    expect(onClear).toHaveBeenCalledWith("hat")
  })

  it("allows dragging from anywhere on the row to reorder layers", () => {
    const host = document.createElement("div")
    const onReorder = vi.fn()

    act(() => {
      createRoot(host).render(
        <StudioAssembly
          body={bodies[0]}
          bodies={bodies}
          bodyTint="#f5bda3"
          bodyHue={0}
          model="classic"
          stackTopFirst={[testHat, testShirt]}
          onModel={vi.fn()}
          onMove={vi.fn()}
          onReorder={onReorder}
          onClear={vi.fn()}
          onPickTone={vi.fn()}
          onBodyHue={vi.fn()}
        />,
      )
    })

    const rows = host.querySelectorAll(".studio-stack-row")
    expect(rows.length).toBe(3) // Fedora, Vintage Plaid, and Body
    const firstRow = rows[0] as HTMLElement

    // Verify draggable affordances on the whole row
    expect(firstRow.className).toContain("cursor-grab")
    expect(firstRow.className).toContain("select-none")
    expect(firstRow.className).toContain("touch-none")

    // Mock setPointerCapture / releasePointerCapture
    firstRow.setPointerCapture = vi.fn()
    firstRow.releasePointerCapture = vi.fn()

    // Mock getBoundingClientRect on rows
    vi.spyOn(rows[0], "getBoundingClientRect").mockReturnValue({
      top: 0,
      bottom: 50,
      height: 50,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: 0,
      toJSON: () => {},
    })
    vi.spyOn(rows[1], "getBoundingClientRect").mockReturnValue({
      top: 60,
      bottom: 110,
      height: 50,
      left: 0,
      right: 200,
      width: 200,
      x: 0,
      y: 60,
      toJSON: () => {},
    })

    // Pointer down on the row itself (e.g. clicking anywhere on the card)
    act(() => {
      firstRow.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          button: 0,
          clientY: 25,
          pointerId: 1,
        }),
      )
    })
    expect(firstRow.setPointerCapture).toHaveBeenCalledWith(1)

    // Pointer move down over the second row
    act(() => {
      firstRow.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientY: 85,
          pointerId: 1,
        }),
      )
    })

    // List container and dragged row styling live in the CSS layer now
    const list = host.querySelector(".studio-layers-list") as HTMLUListElement
    expect(list).toBeTruthy()

    // Dragged row moves vertically with pointer without horizontal scaling
    const activeFirstRow = host.querySelectorAll(".studio-stack-row")[0] as HTMLElement
    expect(activeFirstRow.style.transform).toBe("translateY(60px)")
    expect(activeFirstRow.style.transform).not.toContain("scale")
    expect(activeFirstRow.className).toContain("studio-stack-row-drag")

    // Second row animates out of the way (shifts UP by pitch distance)
    const activeSecondRow = host.querySelectorAll(".studio-stack-row")[1] as HTMLElement
    expect(activeSecondRow.style.transform).toBe("translateY(-60px)")

    // Pointer up to complete the reorder
    act(() => {
      firstRow.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
        }),
      )
    })

    expect(onReorder).toHaveBeenCalledWith("test-hat-1", 1)
  })
})

