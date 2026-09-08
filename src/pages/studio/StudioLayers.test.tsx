import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { StudioLayers } from "./StudioLayers"
import { bodies } from "../../data/bodies"
import { getEyePiece } from "../../data/eyes"

vi.mock("../../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

describe("StudioLayers", () => {
  it("renders the layer stack panel, model selector, and body layer", () => {
    const host = document.createElement("div")
    const onOpenAppearance = vi.fn()
    const onModel = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <StudioLayers
          body={bodies[0]}
          bodyTint="#f5bda3"
          model="classic"
          stackTopFirst={[]}
          onModel={onModel}
          onMove={() => {}}
          onClear={() => {}}
          onOpenAppearance={onOpenAppearance}
        />,
      )
    })

    expect(host.textContent).toContain("Layers")
    expect(host.textContent).toContain("Classic (4px)")
    expect(host.textContent).toContain("Slim (3px)")
    expect(host.textContent).toContain("Body")
    expect(host.textContent).toContain("Fair")
    expect(host.querySelector(".studio-layers-head")).toBeTruthy()
    expect(host.querySelector(".studio-layers-list")).toBeTruthy()

    // Click model switch
    const slimBtn = host.querySelector('button[aria-label="Arm model"] button:last-child, button[aria-pressed="false"]') as HTMLButtonElement
    if (slimBtn) {
      flushSync(() => {
        slimBtn.click()
      })
      expect(onModel).toHaveBeenCalledWith("slim")
    }

    // Click body layer to open appearance
    const bodyRow = host.querySelector(".studio-stack-body") as HTMLElement
    expect(bodyRow).toBeTruthy()
    flushSync(() => {
      bodyRow.click()
    })
    expect(onOpenAppearance).toHaveBeenCalled()
  })

  it("renders equipped eye layer in stackTopFirst with pixel thumb and remove button", () => {
    const host = document.createElement("div")
    const eyePiece = getEyePiece("eye-05")!
    const onClear = vi.fn()

    flushSync(() => {
      createRoot(host).render(
        <StudioLayers
          body={bodies[0]}
          bodyTint="#f5bda3"
          model="classic"
          stackTopFirst={[eyePiece]}
          onModel={() => {}}
          onMove={() => {}}
          onClear={onClear}
        />,
      )
    })

    const stackRows = host.querySelectorAll(".studio-stack-row")
    // Should have eye layer row + body row
    expect(stackRows.length).toBe(2)
    expect(stackRows[0].textContent).toContain("Eyes #05")
    expect(stackRows[0].textContent).toContain("Eyes")

    // Should render an img with pixelated class for eye thumbnail
    const thumbImg = stackRows[0].querySelector("img")
    expect(thumbImg).toBeTruthy()
    expect(thumbImg?.className).toContain("[image-rendering:pixelated]")

    // Click remove button
    const clearBtn = stackRows[0].querySelector(".studio-stack-drop") as HTMLButtonElement
    expect(clearBtn).toBeTruthy()
    flushSync(() => {
      clearBtn.click()
    })
    expect(onClear).toHaveBeenCalledWith("eyes")
  })
})
