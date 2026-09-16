import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EditorPage } from "./EditorPage"
import { CatalogProvider } from "../../state/catalog"
import { WardrobeProvider } from "../../state/wardrobe"
import * as authModule from "../../state/auth"

let root: ReturnType<typeof createRoot> | null = null
let host: HTMLDivElement | null = null

function mountPage() {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  flushSync(() => {
    root!.render(
      <MemoryRouter>
        <CatalogProvider>
          <WardrobeProvider>
            <EditorPage />
          </WardrobeProvider>
        </CatalogProvider>
      </MemoryRouter>,
    )
  })
  return host
}

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  root?.unmount()
  root = null
  host?.remove()
  host = null
})

describe("EditorPage routing", () => {
  it("shows the teaser for signed-out visitors", () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      ...emptyAuth,
      user: null,
    })
    const host = mountPage()
    expect(host.querySelector("canvas")).toBeNull()
    expect(host.textContent).toContain("Editor")
  })

  it("shows the teaser for signed-in non-admins", () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      ...emptyAuth,
      user: { id: "u1" } as never,
      isAdmin: false,
    })
    const host = mountPage()
    expect(host.querySelector("canvas")).toBeNull()
  })

  it("mounts the editor workspace for admins", () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      ...emptyAuth,
      user: { id: "u1" } as never,
      isAdmin: true,
    })
    const host = mountPage()
    expect(host.querySelector("canvas")).not.toBeNull()
    expect(host.textContent).toContain("Save")
  })
})

const emptyAuth: authModule.AuthContextValue = {
  user: null,
  session: null,
  profile: null,
  avatarUrl: null,
  isAdmin: false,
  loading: false,
  profileError: null,
  dismissProfileError: vi.fn(),
  emailVerified: false,
  pendingEmail: null,
  emailVerifyOpen: false,
  openEmailVerify: vi.fn(),
  closeEmailVerify: vi.fn(),
  resendEmailVerification: vi.fn(),
  checkEmailVerification: vi.fn(),
  loginWithDiscord: vi.fn(),
  loginWithGoogle: vi.fn(),
  loginWithPassword: vi.fn(),
  signupWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
} as unknown as authModule.AuthContextValue
