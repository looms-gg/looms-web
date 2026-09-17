import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, useLocation } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EditorPage } from "./EditorPage"
import { WardrobeProvider } from "../state/wardrobe"
import { CatalogProvider } from "../state/catalog"
import { upsertPiece } from "../data/catalog"
import { EDITOR_DRAFT_KEY, DRAFT_SESSION_ID } from "./editor/tools/editorDraft"
import { mockSupabaseFrom } from "../test/supabaseMock"

const authStub = {
  user: { id: "u1" },
  profile: { username: "maker" },
}

vi.mock("../state/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../state/auth")>()
  return {
    ...actual,
    useAuthOptional: () => authStub,
    useAuth: () => authStub,
  }
})

let root: ReturnType<typeof createRoot> | null = null
let host: HTMLDivElement | null = null
let path = ""

function PathProbe() {
  const location = useLocation()
  path = location.pathname + location.search
  return null
}

function mountPage(initialEntries?: string[]) {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  flushSync(() => {
    root!.render(
      <MemoryRouter initialEntries={initialEntries ?? ["/editor"]}>
        <CatalogProvider>
          <WardrobeProvider>
            <PathProbe />
            <EditorPage />
          </WardrobeProvider>
        </CatalogProvider>
      </MemoryRouter>,
    )
  })
  return host
}

function clickButton(host: HTMLElement, testId: string) {
  const button = host.querySelector(
    `[data-testid="${testId}"]`,
  ) as HTMLButtonElement | null
  if (!button) throw new Error(`missing button ${testId}`)
  flushSync(() => button.click())
}

function seedDraft() {
  const bytes = new Uint8Array(64 * 64 * 4)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  sessionStorage.setItem(
    EDITOR_DRAFT_KEY,
    JSON.stringify({
      version: 1,
      sessionId: DRAFT_SESSION_ID,
      pieceId: null,
      model: "classic",
      base: btoa(binary),
      paint: btoa(binary),
      tool: "pencil",
      primaryColor: "#000000",
      secondaryColor: "#ffffff",
      recentColors: [],
    }),
  )
}

beforeEach(() => {
  sessionStorage.clear()
})

afterEach(() => {
  root?.unmount()
  root = null
  host?.remove()
  host = null
})

describe("EditorPage entry gate", () => {
  it("asks what to do before opening the workspace", () => {
    const supabase = mockSupabaseFrom()
    const host = mountPage()

    expect(supabase.fromSpy).toHaveBeenCalled()
    expect(host.querySelector("[data-testid='editor-gate']")).not.toBeNull()
    expect(host.textContent).toContain("Start fresh")
    expect(host.textContent).toContain("Import a piece")
    // The workspace stays hidden until a choice is made
    expect(host.textContent).not.toContain("Layer 1")
  })

  it("start fresh opens the workspace and clears a pending draft", () => {
    mockSupabaseFrom()
    seedDraft()
    const host = mountPage()

    expect(host.querySelector("[data-testid='editor-gate-resume']")).not.toBeNull()
    clickButton(host, "editor-gate-fresh")

    expect(host.textContent).toContain("Layer 1")
    expect(host.querySelector("[data-testid='editor-gate']")).toBeNull()
    expect(sessionStorage.getItem("looms:editor_draft_v1")).toBeNull()
  })

  it("resume draft keeps the draft and opens the workspace", () => {
    mockSupabaseFrom()
    seedDraft()
    const host = mountPage()

    clickButton(host, "editor-gate-resume")

    expect(host.textContent).toContain("Layer 1")
    expect(sessionStorage.getItem("looms:editor_draft_v1")).not.toBeNull()
  })

  it("import lists your own pieces and opens one in the editor", async () => {
    mockSupabaseFrom()
    upsertPiece({
      id: "mine-1",
      name: "My Cozy Shirt",
      slot: "shirt",
      group: "torso",
      maker: "maker",
      savedCount: 0,
      likeCount: 0,
      added: 1,
      blurb: "",
      skin: "https://example.com/mine.png",
      userId: "u1",
      isPublic: true,
    })
    const host = mountPage()

    clickButton(host, "editor-gate-import")
    expect(host.textContent).toContain("My Cozy Shirt")

    const pick = Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent?.includes("My Cozy Shirt"),
    ) as HTMLButtonElement
    await act(async () => {
      pick.click()
    })

    expect(path).toBe("/editor?piece=mine-1")
    expect(host.querySelector("[data-testid='editor-gate']")).toBeNull()
  })

  it("skips the gate when a piece id is in the URL", async () => {
    mockSupabaseFrom()
    const host = mountPage(["/editor?piece=missing"])
    await act(async () => {})

    expect(host.querySelector("[data-testid='editor-gate']")).toBeNull()
    expect(host.textContent).toContain("You can only edit pieces you uploaded.")
  })
})

describe("EditorPage (MineSkin 1:1)", () => {
  it("renders editor workspace with stage canvas, toolbar, mannequin filter, and action bar", () => {
    mockSupabaseFrom()
    const host = mountPage()
    clickButton(host, "editor-gate-fresh")
    expect(host.textContent).toContain("Layer 1")
    expect(host.textContent).toContain("Layer 2")
    expect(host.textContent).toContain("Editing")
    expect(host.querySelector("canvas")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Save & Export']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Pen (P)']")).not.toBeNull()
    expect(host.querySelector("button[aria-label='Color Picker']")).not.toBeNull()
  })

  it("explains that only your own pieces can be edited", async () => {
    mockSupabaseFrom()
    const host = mountPage(["/editor?piece=nope"])
    await act(async () => {})

    expect(host.textContent).toContain("You can only edit pieces you uploaded.")
  })
})
