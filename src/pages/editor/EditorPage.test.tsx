import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router-dom"
import { EditorPage } from "./EditorPage"

function renderEditor(path = "/editor") {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <MemoryRouter initialEntries={[path]}>
        <EditorPage />
      </MemoryRouter>,
    )
  })
  return host
}

describe("EditorPage", () => {
  it("leads with the skeleton mockup, message centered below", () => {
    const host = renderEditor()

    const frame = host.querySelector(".editor-frame") as HTMLElement
    expect(frame).toBeTruthy()
    const section = host.querySelector("section") as HTMLElement
    expect(section).toBeTruthy()

    // Skeleton comes before the message in document order
    expect(frame.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    // Message block is center-aligned
    expect(section.className).toMatch(/items-center/)
    expect(section.className).toMatch(/text-center/)
  })

  it("states it is under construction, coming soon, and what will ship", () => {
    const host = renderEditor()
    expect(host.textContent).toMatch(/being built/i)
    expect(host.textContent).toMatch(/Under construction/i)
    expect(host.textContent).toMatch(/Coming soon/i)
    expect(host.textContent).toMatch(/Check back soon/i)

    // The promise: powerful creation + direct publishing
    expect(host.textContent).toMatch(/live 3D figure/i)
    expect(host.textContent).toMatch(/publish/i)
  })

  it("renders the skeleton as blobs only", () => {
    const host = renderEditor()

    const frame = host.querySelector(".editor-frame") as HTMLElement
    expect(frame.getAttribute("role")).toBe("img")
    expect(frame.getAttribute("aria-label")).toMatch(/preview of the upcoming looms editor/i)

    const bones = host.querySelectorAll(".editor-bone")
    expect(bones.length).toBeGreaterThan(10)

    // No text or icons inside the skeleton mockup itself
    expect(frame.textContent?.trim()).toBe("")
  })
})
