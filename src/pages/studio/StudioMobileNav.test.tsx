import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { StudioMobileNav } from "./StudioMobileNav"

describe("StudioMobileNav", () => {
  it("renders three tab buttons", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <StudioMobileNav stage="preview" onStage={() => {}} />
      )
    })
    const tabs = host.querySelectorAll("[data-testid^='studio-mobile-tab-']")
    expect(tabs.length).toBe(3)
    expect(host.querySelector("[data-testid='studio-mobile-tab-preview']")).toBeTruthy()
    expect(host.querySelector("[data-testid='studio-mobile-tab-pieces']")).toBeTruthy()
    expect(host.querySelector("[data-testid='studio-mobile-tab-layers']")).toBeTruthy()
  })

  it("marks the active stage with aria-pressed and active class", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <StudioMobileNav stage="pieces" onStage={() => {}} />
      )
    })
    const piecesTab = host.querySelector(
      "[data-testid='studio-mobile-tab-pieces']"
    ) as HTMLButtonElement
    expect(piecesTab.getAttribute("aria-pressed")).toBe("true")
    expect(piecesTab.classList.contains("studio-mobile-tab--active")).toBe(true)

    const previewTab = host.querySelector(
      "[data-testid='studio-mobile-tab-preview']"
    ) as HTMLButtonElement
    expect(previewTab.getAttribute("aria-pressed")).toBe("false")
    expect(previewTab.classList.contains("studio-mobile-tab--active")).toBe(false)
  })

  it("calls onStage with correct value when a tab is clicked", () => {
    const host = document.createElement("div")
    const onStage = vi.fn()
    flushSync(() => {
      createRoot(host).render(
        <StudioMobileNav stage="preview" onStage={onStage} />
      )
    })
    const layersTab = host.querySelector(
      "[data-testid='studio-mobile-tab-layers']"
    ) as HTMLButtonElement
    flushSync(() => { layersTab.click() })
    expect(onStage).toHaveBeenCalledWith("layers")

    const piecesTab = host.querySelector(
      "[data-testid='studio-mobile-tab-pieces']"
    ) as HTMLButtonElement
    flushSync(() => { piecesTab.click() })
    expect(onStage).toHaveBeenCalledWith("pieces")
  })
})
