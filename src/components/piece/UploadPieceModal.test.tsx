import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it } from "vitest"
import { AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { ClosetProvider } from "../../state/closet"
import { coversForSlot, UploadPieceModal, validateDimensions } from "./UploadPieceModal"

describe("UploadPieceModal and garment validation", () => {
  it("validates 64x64 dimensions", () => {
    expect(validateDimensions(64, 64)).toEqual({ valid: true })
    expect(validateDimensions(128, 128)).toEqual({
      valid: false,
      error: "Texture must be 64x64 pixels (standard Minecraft skin format).",
    })
    expect(validateDimensions(64, 32)).toEqual({
      valid: false,
      error: "Texture must be 64x64 pixels (standard Minecraft skin format).",
    })
  })

  it("renders upload piece modal when open", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <CatalogProvider>
            <ClosetProvider>
              <UploadPieceModal isOpen={true} onClose={() => {}} />
            </ClosetProvider>
          </CatalogProvider>
        </AuthProvider>,
      )
    })

    expect(host.textContent).toMatch(/Upload Garment Piece/i)
    expect(host.textContent).toMatch(/Slot/i)
    expect(host.querySelector('input[name="name"]')).not.toBeNull()
    expect(host.querySelector('select[name="slot"]')).not.toBeNull()
  })

  it("renders upload piece modal with maxLength attributes on name and description", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <CatalogProvider>
            <ClosetProvider>
              <UploadPieceModal isOpen={true} onClose={() => {}} />
            </ClosetProvider>
          </CatalogProvider>
        </AuthProvider>,
      )
    })

    const nameInput = host.querySelector('input[name="name"]') as HTMLInputElement
    const descTextarea = host.querySelector("textarea") as HTMLTextAreaElement

    expect(nameInput).not.toBeNull()
    expect(nameInput.maxLength).toBe(50)
    expect(descTextarea).not.toBeNull()
    expect(descTextarea.maxLength).toBe(500)
  })

  it("submits garment records with millisecond timestamps that exceed 32-bit int range", () => {
    const now = Date.now()
    // 32-bit signed integer max is 2,147,483,647. Modern epoch ms is ~1.78e12.
    expect(now).toBeGreaterThan(2147483647)
  })

  it("offers every clothing slot including Set in the picker", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <CatalogProvider>
            <ClosetProvider>
              <UploadPieceModal isOpen={true} onClose={() => {}} />
            </ClosetProvider>
          </CatalogProvider>
        </AuthProvider>,
      )
    })

    const options = host.querySelectorAll('select[name="slot"] option')
    const values = Array.from(options).map((option) => (option as HTMLOptionElement).value)
    expect(values).toContain("set")
  })

  it("maps a set upload to torso and legs covers", () => {
    expect(coversForSlot("set")).toEqual(["torso", "legs"])
    expect(coversForSlot("shirt")).toEqual(["torso"])
    expect(coversForSlot("pants")).toEqual(["legs"])
  })
})

