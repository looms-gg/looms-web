import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { StudioStagePanel } from "./StudioStagePanel"
import type { Look } from "../../state/wardrobe"

vi.mock("../../components/iso/SkinStage", () => ({
  SkinStage: () => <div data-testid="mock-skin-stage" />,
}))

describe("StudioStagePanel", () => {
  it("exports the studio stage panel", () => {
    expect(typeof StudioStagePanel).toBe("function")
  })

  it("renders the overwrite modal when confirmOverwriteLook is provided", () => {
    const host = document.createElement("div")
    const onConfirmOverwrite = vi.fn()
    const onSaveAsNew = vi.fn()
    const onCancelOverwrite = vi.fn()

    const mockLook: Look = {
      id: "look-1",
      name: "Cyber Knight",
      equipped: {},
      stack: [],
      bodyId: "body-4",
      bodyHue: 0,
      model: "classic",
      savedAt: 1000,
      description: "",
      visibility: "private",
    }

    flushSync(() => {
      createRoot(host).render(
        <StudioStagePanel
          outfit={[]}
          bodyId="steve"
          bodyHue={0}
          model="classic"
          name="Cyber Knight"
          onName={() => {}}
          onSave={() => {}}
          onDownload={() => {}}
          confirmOverwriteLook={mockLook}
          onConfirmOverwrite={onConfirmOverwrite}
          onSaveAsNew={onSaveAsNew}
          onCancelOverwrite={onCancelOverwrite}
        />,
      )
    })

    const dialog = host.querySelector('[role="dialog"]')
    expect(dialog).toBeTruthy()
    expect(dialog?.textContent).toContain("This skin seems to already exist!")
    expect(dialog?.textContent).toContain("Cyber Knight")

    const overwriteBtn = Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Overwrite",
    )
    expect(overwriteBtn).toBeTruthy()
    overwriteBtn?.click()
    expect(onConfirmOverwrite).toHaveBeenCalledTimes(1)
  })

  it("enforces maxLength on look name input", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <StudioStagePanel
          outfit={[]}
          bodyId="steve"
          bodyHue={0}
          model="classic"
          name="My Look"
          onName={() => {}}
          onSave={() => {}}
          onDownload={() => {}}
        />,
      )
    })

    const input = host.querySelector('input[aria-label="Look name"]') as HTMLInputElement
    expect(input).toBeTruthy()
    expect(input.maxLength).toBe(50)
    expect(host.querySelector(".studio-stage-head")).toBeTruthy()
    expect(host.querySelector(".studio-stage-view")).toBeTruthy()
    expect(host.querySelector(".studio-stage-save")).toBeTruthy()
  })
})
