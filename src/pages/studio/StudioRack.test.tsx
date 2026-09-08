import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { emptyOwnedBySlot, StudioRack } from "./StudioRack"
import { bodies } from "../../data/bodies"

vi.mock("../../components/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

describe("StudioRack", () => {
  it("exports the piece rack and an empty slot map", () => {
    expect(typeof StudioRack).toBe("function")
    expect(Object.keys(emptyOwnedBySlot()).length).toBeGreaterThan(0)
  })

  it("renders top-level Pieces and Appearance tabs, category tabs, and clickable pieces", () => {
    const host = document.createElement("div")
    const onRack = vi.fn()
    const onWear = vi.fn()
    const onClear = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioRack
            ownedCount={1}
            ownedBySlot={{
              ...emptyOwnedBySlot(),
              shirt: [
                {
                  id: "test-shirt",
                  name: "Test Shirt",
                  slot: "shirt",
                  group: "torso",
                  maker: "Test",
                  savedCount: 0,
                  likeCount: 0,
                  added: 0,
                  blurb: "Test blurb",
                  skin: "data:image/png;base64,test",
                },
              ],
            }}
            racks={["shirt"]}
            rack="all"
            equipped={{}}
            onRack={onRack}
            onWear={onWear}
            onClear={onClear}
          />
        </MemoryRouter>,
      )
    })

    // Both Pieces and Appearance are clickable buttons in the header
    const piecesBtn = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Pieces",
    )
    const appearanceBtn = [...host.querySelectorAll("button")].find(
      (b) => b.textContent?.includes("Appearance"),
    )
    expect(piecesBtn).toBeTruthy()
    expect(appearanceBtn).toBeTruthy()

    // Clicking Appearance tab triggers onRack("appearance")
    flushSync(() => {
      appearanceBtn?.click()
    })
    expect(onRack).toHaveBeenCalledWith("appearance")

    // In Pieces view, category tabs exist and are scrollable
    const tabsContainer = host.querySelector('[data-testid="studio-wardrobe-tabs"]') as HTMLElement
    expect(tabsContainer).toBeTruthy()
    expect(tabsContainer.textContent).toContain("All")
    expect(host.querySelector(".studio-wardrobe-head")).toBeTruthy()
    expect(host.querySelector(".studio-wardrobe-body")).toBeTruthy()
    expect(tabsContainer.textContent).toContain("Shirt")

    // Clicking a piece row triggers onWear
    const pieceBtn = host.querySelector('button[aria-label="Wear Test Shirt"]') as HTMLButtonElement
    expect(pieceBtn).toBeTruthy()
    flushSync(() => {
      pieceBtn.click()
    })
    expect(onWear).toHaveBeenCalledWith("test-shirt")

    // Dispatching a vertical wheel event scrolls horizontally
    tabsContainer.scrollLeft = 0
    tabsContainer.dispatchEvent(
      new WheelEvent("wheel", { deltaY: 100, deltaX: 0, bubbles: true }),
    )
    expect(tabsContainer.scrollLeft).toBe(100)
  })

  it("renders Appearance tab with skin tones, hue slider, and eyes gallery", () => {
    const host = document.createElement("div")
    const onWear = vi.fn()
    const onClear = vi.fn()
    const onPickTone = vi.fn()
    const onBodyHue = vi.fn()
    const onEyeOffset = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioRack
            ownedCount={0}
            ownedBySlot={emptyOwnedBySlot()}
            racks={[]}
            rack="appearance"
            equipped={{ eyes: "eye-01@-1" }}
            equippedEyes="eye-01@-1"
            eyeOffset={-1}
            bodies={bodies}
            body={bodies[0]}
            bodyId={bodies[0].id}
            bodyHue={15}
            bodyTint="#f5bda3"
            hueOpen={true}
            onRack={() => {}}
            onWear={onWear}
            onClear={onClear}
            onPickTone={onPickTone}
            onBodyHue={onBodyHue}
            onEyeOffset={onEyeOffset}
          />
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toContain("Skin Tone")
    expect(host.textContent).toContain("Hue Shift")
    expect(host.textContent).toContain("+15")
    expect(host.textContent).toContain("Eyes")
    expect(host.textContent).toContain("71")
    expect(host.textContent).toContain("Eye height")
    expect(host.textContent).toContain("Up 1")
    expect(host.textContent).not.toContain("Eye Position")
    expect(host.querySelector('button[aria-label="Move eyes up"]')).toBeNull()
    expect(host.querySelector('button[aria-label="Move eyes down"]')).toBeNull()

    // Offset-encoded equipped id still marks the base eye as selected
    const eye01Btn = host.querySelector('button[aria-label="Eyes #01"]') as HTMLButtonElement
    expect(eye01Btn?.getAttribute("aria-pressed")).toBe("true")

    const eyeHeightInput = host.querySelector(
      'input[type="range"][aria-label="Eye height on face"]',
    ) as HTMLInputElement
    expect(eyeHeightInput).toBeTruthy()
    expect(eyeHeightInput.min).toBe("-3")
    expect(eyeHeightInput.max).toBe("1")
    expect(eyeHeightInput.value).toBe("-1")

    flushSync(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set
      nativeSetter?.call(eyeHeightInput, "-2")
      eyeHeightInput.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(onEyeOffset).toHaveBeenCalledWith(-2)

    const resetEyeBtn = host.querySelector(
      'button[aria-label="Reset eye height"]',
    ) as HTMLButtonElement
    expect(resetEyeBtn).toBeTruthy()
    flushSync(() => {
      resetEyeBtn.click()
    })
    expect(onEyeOffset).toHaveBeenCalledWith(0)

    // Tone swatch click
    const toneButtons = host.querySelectorAll(".studio-tone")
    expect(toneButtons.length).toBe(bodies.length)
    flushSync(() => {
      ;(toneButtons[1] as HTMLButtonElement).click()
    })
    expect(onPickTone).toHaveBeenCalledWith(bodies[1].id)

    // Hue slider change
    const hueInput = host.querySelector(
      'input[type="range"][aria-label^="Hue shift"]',
    ) as HTMLInputElement
    expect(hueInput).toBeTruthy()
    flushSync(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set
      nativeSetter?.call(hueInput, "20")
      hueInput.dispatchEvent(new Event("change", { bubbles: true }))
    })
    expect(onBodyHue).toHaveBeenCalledWith(20)

    // Eye filtering
    const filterInput = host.querySelector('input[placeholder*="Filter eyes"]') as HTMLInputElement
    expect(filterInput).toBeTruthy()
    flushSync(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set
      nativeSetter?.call(filterInput, "02")
      filterInput.dispatchEvent(new Event("change", { bubbles: true }))
    })

    // Click Eye #02 button
    const eye02Btn = host.querySelector('button[aria-label="Eyes #02"]') as HTMLButtonElement
    expect(eye02Btn).toBeTruthy()
    flushSync(() => {
      eye02Btn.click()
    })
    expect(onWear).toHaveBeenCalledWith("eye-02")

    // Clear eyes button in header
    const clearEyesHeaderBtn = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Clear eyes"),
    ) as HTMLButtonElement
    expect(clearEyesHeaderBtn).toBeTruthy()
    flushSync(() => {
      clearEyesHeaderBtn.click()
    })
    expect(onClear).toHaveBeenCalledWith("eyes")

    // Default (no eyes) tile button
    const defaultTileBtn = host.querySelector('button[aria-label="No eyes"]') as HTMLButtonElement
    expect(defaultTileBtn).toBeTruthy()
    flushSync(() => {
      defaultTileBtn.click()
    })
    expect(onClear).toHaveBeenCalledWith("eyes")
  })

  it("shows appearance shortcut in empty pieces state", () => {
    const host = document.createElement("div")
    const onRack = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioRack
            ownedCount={0}
            ownedBySlot={emptyOwnedBySlot()}
            racks={[]}
            rack="all"
            equipped={{}}
            onRack={onRack}
            onWear={() => {}}
            onClear={() => {}}
          />
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toContain("Nothing unlocked yet")
    const appearanceShortcut = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Appearance"),
    )
    expect(appearanceShortcut).toBeTruthy()
    flushSync(() => {
      appearanceShortcut?.click()
    })
    expect(onRack).toHaveBeenCalledWith("appearance")
  })
})
