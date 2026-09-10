import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import { StudioMobileShell } from "./StudioMobileShell"
import { emptyOwnedBySlot } from "./studioOwned"
import { bodies } from "../../data/bodies"

vi.mock("../../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))
vi.mock("../../components/iso/SkinStage", () => ({
  SkinStage: () => <canvas data-testid="mock-skin-stage" />,
}))

function makeBoard() {
  return {
    name: "Test Look",
    setName: vi.fn(),
    rack: "all" as const,
    setRack: vi.fn(),
    hueOpen: false,
    outfit: [],
    ownedBySlot: emptyOwnedBySlot(),
    racks: [] as never[],
    stackTopFirst: [],
    body: bodies[0],
    bodyId: bodies[0].id,
    bodyTint: bodies[0].swatch,
    bodyHue: 0,
    bodies,
    equippedEyes: undefined,
    eyeOffset: 0,
    equipped: {},
    model: "classic" as const,
    confirmOverwriteLook: null,
    onSave: vi.fn(),
    onDownload: vi.fn(),
    onConfirmOverwrite: vi.fn(),
    onSaveAsNew: vi.fn(),
    onCancelOverwrite: vi.fn(),
    downloadSkin: vi.fn(),
    setEyeOffset: vi.fn(),
    wearEye: vi.fn(),
    pickTone: vi.fn(),
    wear: vi.fn(),
    clearSlot: vi.fn(),
    moveStack: vi.fn(),
    setModel: vi.fn(),
    setBody: vi.fn(),
    setBodyHue: vi.fn(),
    // useStudioBoard spreads the full useWardrobe context into its return; the
    // shell only reads the fields listed above, so the rest stays unstubbed.
  } as unknown as ReturnType<typeof import("./useStudioBoard").useStudioBoard>
}

describe("StudioMobileShell", () => {
  it("renders the mobile nav with three tabs", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioMobileShell board={makeBoard()} />
        </MemoryRouter>
      )
    })
    expect(host.querySelector("[data-testid='studio-mobile-tab-preview']")).toBeTruthy()
    expect(host.querySelector("[data-testid='studio-mobile-tab-pieces']")).toBeTruthy()
    expect(host.querySelector("[data-testid='studio-mobile-tab-layers']")).toBeTruthy()
  })

  it("switches to Pieces stage when Pieces tab is clicked", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioMobileShell board={makeBoard()} />
        </MemoryRouter>
      )
    })
    // Default stage is preview — skin stage should be present
    expect(host.querySelector("[data-testid='mock-skin-stage']")).toBeTruthy()

    // Click Pieces tab
    const piecesTab = host.querySelector(
      "[data-testid='studio-mobile-tab-pieces']"
    ) as HTMLButtonElement
    flushSync(() => { piecesTab.click() })

    // Pieces stage: wardrobe head should now be present
    expect(host.querySelector(".studio-wardrobe-head")).toBeTruthy()
    // Skin stage is gone
    expect(host.querySelector("[data-testid='mock-skin-stage']")).toBeNull()
  })

  it("switches to Layers stage when Layers tab is clicked", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <StudioMobileShell board={makeBoard()} />
        </MemoryRouter>
      )
    })
    const layersTab = host.querySelector(
      "[data-testid='studio-mobile-tab-layers']"
    ) as HTMLButtonElement
    flushSync(() => { layersTab.click() })
    expect(host.querySelector(".studio-layers-head")).toBeTruthy()
  })
})
