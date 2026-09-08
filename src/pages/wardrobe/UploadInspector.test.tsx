import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter, useLocation } from "react-router-dom"
import { describe, expect, it, vi, beforeEach } from "vitest"
import { type Piece } from "../../data/catalog"
import { ClosetProvider } from "../../state/closet"
import { CatalogProvider } from "../../state/catalog"
import { AuthContext, type AuthContextValue } from "../../state/auth"
import { UploadInspector } from "./UploadInspector"
import { supabase } from "../../lib/supabase"

vi.mock("../../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

const mockPiece: Piece = {
  id: "test-garment-1",
  name: "Cyber Jacket",
  slot: "shirt",
  group: "torso",
  maker: "cen0b",
  savedCount: 0,
  likeCount: 0,
  added: 1700000000000,
  blurb: "A cool neon jacket",
  skin: "https://pcybqblxszemklcxunuz.supabase.co/storage/v1/object/public/garments/test/jacket.png",
  userId: "user-123",
  isPublic: true,
}

function stubAuth(userId = "user-123"): AuthContextValue {
  return {
    user: { id: userId, email: "user@test.dev" } as AuthContextValue["user"],
    session: {} as AuthContextValue["session"],
    profile: { id: userId, username: "cen0b" } as AuthContextValue["profile"],
    avatarUrl: null,
    loading: false,
    emailVerified: true,
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: vi.fn(),
    dismissEmailVerify: vi.fn(),
    resendConfirmation: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    refreshProfile: vi.fn(),
    profileError: null,
    dismissProfileError: vi.fn(),
  }
}

function PathPeek() {
  const loc = useLocation()
  return <span data-testid="path">{loc.pathname}</span>
}

function setInputValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    input instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event("input", { bubbles: true }))
}

describe("UploadInspector", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("renders upload details with slot, name, blurb, and public status", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={stubAuth()}>
            <CatalogProvider>
            <ClosetProvider>
              <UploadInspector piece={mockPiece} />
            </ClosetProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    expect(host.textContent).toContain("Cyber Jacket")
    expect(host.textContent).toContain("A cool neon jacket")
    expect(host.textContent).toContain("Shirt")
    expect(host.textContent).toContain("Public in Explore")
    expect(host.textContent).toContain("Upload new version")
    expect(host.textContent).toContain("Wear in Studio")
    expect(host.textContent).toContain("Delete upload")
  })

  it("renames garment on Enter", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    vi.spyOn(supabase, "from").mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: updateSpy,
      } as never
    })

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={stubAuth()}>
            <CatalogProvider>
            <ClosetProvider>
              <UploadInspector piece={mockPiece} />
            </ClosetProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    const editNameBtn = host.querySelector(
      'button[aria-label="Edit garment name"]',
    ) as HTMLButtonElement
    expect(editNameBtn).toBeTruthy()
    flushSync(() => {
      editNameBtn.click()
    })

    const input = host.querySelector(
      'input[aria-label="Garment name"]',
    ) as HTMLInputElement
    expect(input).toBeTruthy()
    flushSync(() => {
      setInputValue(input, "Neon Trench")
    })
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(updateSpy).toHaveBeenCalledWith({ name: "Neon Trench" })
  })

  it("toggles public/private status", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    vi.spyOn(supabase, "from").mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: updateSpy,
      } as never
    })

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={stubAuth()}>
            <CatalogProvider>
            <ClosetProvider>
              <UploadInspector piece={mockPiece} />
            </ClosetProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    const toggle = host.querySelector(
      'input[role="switch"][aria-label="Public garment"]',
    ) as HTMLInputElement
    expect(toggle).toBeTruthy()
    expect(toggle.checked).toBe(true)

    await act(async () => {
      toggle.click()
    })

    expect(updateSpy).toHaveBeenCalledWith({ is_public: false })
  })

  it("clicking Wear in Studio equips garment and navigates", async () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={stubAuth()}>
            <CatalogProvider>
            <ClosetProvider>
              <UploadInspector piece={mockPiece} />
              <PathPeek />
            </ClosetProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    const wearBtn = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Wear in Studio"),
    ) as HTMLButtonElement
    expect(wearBtn).toBeTruthy()

    await act(async () => {
      wearBtn.click()
    })

    expect(host.querySelector('[data-testid="path"]')?.textContent).toBe("/studio")
  })

  it("enforces maxLength and sanitizes garment name on submit", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    vi.spyOn(supabase, "from").mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: updateSpy,
      } as never
    })

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={stubAuth()}>
            <CatalogProvider>
            <ClosetProvider>
              <UploadInspector piece={mockPiece} />
            </ClosetProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    const editNameBtn = host.querySelector(
      'button[aria-label="Edit garment name"]',
    ) as HTMLButtonElement
    flushSync(() => {
      editNameBtn.click()
    })

    const input = host.querySelector(
      'input[aria-label="Garment name"]',
    ) as HTMLInputElement
    expect(input.maxLength).toBe(50)

    flushSync(() => {
      setInputValue(input, "<script>alert('xss')</script>Neon Cloak")
    })
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(updateSpy).toHaveBeenCalledWith({ name: "Neon Cloak" })
  })

  it("enforces maxLength on description textarea and sanitizes description", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    vi.spyOn(supabase, "from").mockImplementation(() => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        update: updateSpy,
      } as never
    })

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter initialEntries={["/wardrobe?tab=uploads"]}>
          <AuthContext.Provider value={stubAuth()}>
            <CatalogProvider>
            <ClosetProvider>
              <UploadInspector piece={mockPiece} />
            </ClosetProvider>
            </CatalogProvider>
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    const editDescBtn = host.querySelector(
      'button[aria-label="Edit garment description"]',
    ) as HTMLButtonElement
    flushSync(() => {
      editDescBtn.click()
    })

    const textarea = host.querySelector(
      'textarea[aria-label="Garment description"]',
    ) as HTMLTextAreaElement
    expect(textarea.maxLength).toBe(500)

    flushSync(() => {
      setInputValue(textarea, "<b>Fresh style</b>")
    })
    await act(async () => {
      textarea.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    })

    expect(updateSpy).toHaveBeenCalledWith({ description: "Fresh style" })
  })
})
