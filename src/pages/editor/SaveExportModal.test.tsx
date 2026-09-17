import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react"
import { MemoryRouter, useLocation } from "react-router-dom"
import { SaveExportModal } from "./SaveExportModal"
import { WardrobeProvider } from "../../state/wardrobe"
import { CatalogProvider } from "../../state/catalog"
import { mockSupabaseFrom } from "../../test/supabaseMock"

const { publishMock, overwriteMock } = vi.hoisted(() => ({
  publishMock: vi.fn(),
  overwriteMock: vi.fn(),
}))

vi.mock("../../lib/piecePublish/publishGarment", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../lib/piecePublish/publishGarment")
  >()
  return { ...actual, publishGarmentTexture: publishMock }
})
vi.mock("../../lib/piecePublish/overwritePieceTexture", () => ({
  overwritePieceTexture: overwriteMock,
}))

vi.mock("../../state/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../state/auth")>()
  return {
    ...actual,
    useAuthOptional: () => ({
      user: { id: "u1" },
      profile: { username: "maker" },
    }),
  }
})

function makeCanvas() {
  const canvas = document.createElement("canvas")
  canvas.width = 64
  canvas.height = 64
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (cb: BlobCallback | null) => {
      cb?.(new Blob(["png"], { type: "image/png" }))
      return null
    },
  )
  return canvas
}

const piece = {
  id: "p1",
  name: "Cozy Shirt",
  slot: "shirt",
  group: "torso",
  maker: "maker",
  savedCount: 0,
  likeCount: 0,
  added: 0,
  blurb: "",
  skin: "",
  userId: "u1",
} as any

function mount(ui: React.ReactElement) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          CatalogProvider,
          null,
          React.createElement(WardrobeProvider, null, ui),
        ),
      ),
    )
  })
  return host
}

function mountRouted(ui: React.ReactElement, onPath: (path: string) => void) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const probe = React.createElement(LocationProbe, { onPath })
  flushSync(() => {
    createRoot(host).render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(CatalogProvider, null,
          React.createElement(WardrobeProvider, null, probe, ui)),
      ),
    )
  })
  return host
}

function LocationProbe({ onPath }: { onPath: (path: string) => void }) {
  const location = useLocation()
  onPath(location.pathname + location.search)
  return null
}

function fillInput(host: HTMLElement, id: string, value: string) {
  const input = host.querySelector(`#${id}`) as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new window.Event("input", { bubbles: true }))
}

function fillTextarea(host: HTMLElement, id: string, value: string) {
  const input = host.querySelector(`#${id}`) as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value",
  )!.set!
  setter.call(input, value)
  input.dispatchEvent(new window.Event("input", { bubbles: true }))
}

describe("SaveExportModal", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    publishMock.mockResolvedValue({ pieceId: "new", row: {}, maker: "maker" })
    overwriteMock.mockResolvedValue({ piece })
  })

  it("fresh session: shows the publish form as primary and download in the menu", () => {
    const host = mount(
      React.createElement(SaveExportModal, {
        open: true,
        onClose: () => {},
        paintCanvas: makeCanvas(),
        session: { kind: "fresh" },
        portal: false,
      }),
    )
    expect(host.textContent).toContain("Publish")
    expect(host.textContent).toContain("What kind of piece is it?")
    expect(host.textContent).not.toContain("Wardrobe Look")
    expect(host.textContent).not.toContain("Extract Garment")

    const moreBtn = Array.from(host.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "More export options",
    ) as HTMLButtonElement
    flushSync(() => moreBtn.click())
    expect(host.textContent).toContain("Download PNG")
  })

  it("piece session: overwrite is primary, menu offers save-as-new and download", () => {
    const host = mount(
      React.createElement(SaveExportModal, {
        open: true,
        onClose: () => {},
        paintCanvas: makeCanvas(),
        session: { kind: "piece", piece },
        portal: false,
      }),
    )
    expect(host.textContent).toContain("Overwrite piece")
    expect(host.textContent).toContain(piece.name)

    const moreBtn = Array.from(host.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "More export options",
    ) as HTMLButtonElement
    flushSync(() => moreBtn.click())
    expect(host.textContent).toContain("Download PNG")

    const saveAsNew = Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("Save as new piece"),
    ) as HTMLButtonElement
    flushSync(() => saveAsNew.click())
    expect(host.textContent).toContain("What kind of piece is it?")
  })

  it("piece session: overwriting calls the lib with the piece identity", async () => {
    const host = mount(
      React.createElement(SaveExportModal, {
        open: true,
        onClose: () => {},
        paintCanvas: makeCanvas(),
        session: { kind: "piece", piece },
        portal: false,
      }),
    )
    const overwriteBtn = Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Overwrite piece",
    ) as HTMLButtonElement
    await flushSync(() => {
      overwriteBtn.click()
    })
    await Promise.resolve()
    expect(overwriteMock).toHaveBeenCalledTimes(1)
    expect(overwriteMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", pieceId: "p1", slot: "shirt" }),
    )
  })

  it("fresh session: publish sends the signed-in user id and chosen slot", async () => {
    const host = mount(
      React.createElement(SaveExportModal, {
        open: true,
        onClose: () => {},
        paintCanvas: makeCanvas(),
        session: { kind: "fresh" },
        portal: false,
      }),
    )
    const shirtSlot = Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Shirt",
    ) as HTMLButtonElement
    flushSync(() => shirtSlot.click())
    const form = host.querySelector("form") as HTMLFormElement
    await flushSync(() => {
      form.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      )
    })
    await Promise.resolve()
    expect(publishMock).toHaveBeenCalledTimes(1)
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", slot: "shirt" }),
    )
  })

  it("fresh session: description written on the save form is sent with the publish", async () => {
    const host = mount(
      React.createElement(SaveExportModal, {
        open: true,
        onClose: () => {},
        paintCanvas: makeCanvas(),
        session: { kind: "fresh" },
        portal: false,
      }),
    )
    expect(host.querySelector("#garment-description")).not.toBeNull()
    fillTextarea(host, "garment-description", "Comfy winter layers")
    fillInput(host, "garment-name", "Snow Sweater")
    const form = host.querySelector("form") as HTMLFormElement
    await flushSync(() => {
      form.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      )
    })
    await Promise.resolve()
    expect(publishMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Snow Sweater",
        description: "Comfy winter layers",
      }),
    )
  })

  it("fresh session: publish adds the piece to the wardrobe and opens its details page", async () => {
    publishMock.mockResolvedValue({
      pieceId: "new",
      row: {
        id: "new",
        user_id: "u1",
        name: "Snow Sweater",
        description: null,
        slot: "shirt",
        body_group: "torso",
        saved_count: 0,
        like_count: 0,
        added: 1,
        covers: ["torso"],
        texture_url: "https://example.com/new.png",
        is_public: true,
        tags: [],
        created_at: new Date().toISOString(),
      },
      maker: "maker",
    })
    const supabase = mockSupabaseFrom()
    let path = ""
    const host = mountRouted(
      React.createElement(SaveExportModal, {
        open: true,
        onClose: () => {},
        paintCanvas: makeCanvas(),
        session: { kind: "fresh" },
        portal: false,
      }),
      (p) => {
        path = p
      },
    )
    fillInput(host, "garment-name", "Snow Sweater")
    const form = host.querySelector("form") as HTMLFormElement
    await flushSync(() => {
      form.dispatchEvent(
        new window.Event("submit", { bubbles: true, cancelable: true }),
      )
    })
    await Promise.resolve()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    await Promise.resolve()

    const wardrobeInserts = supabase.getQueries("wardrobe_items", "insert")
    expect(wardrobeInserts.length).toBeGreaterThan(0)
    expect(path).toBe("/piece/new")
  })
})
