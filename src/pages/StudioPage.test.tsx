import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { StudioPage } from "./StudioPage"
import { AuthContext, type AuthContextValue } from "../state/auth"
import { CatalogProvider } from "../state/catalog"
import { WardrobeProvider } from "../state/wardrobe"
import { LikesProvider } from "../state/likes"
import { mockSupabaseFrom } from "../test/supabaseMock"
import { makeAuthStub } from "../test/authStub"

vi.mock("../components/iso/SkinStage", () => ({
  SkinStage: () => <div data-testid="mock-skin-stage" />,
}))

vi.mock("../components/iso/IsoThumb", () => ({
  IsoThumb: () => <div data-testid="mock-iso-thumb" />,
}))

function stubAuth(userId: string): AuthContextValue {
  return makeAuthStub({
    user: { id: userId, email: "test@looms.dev" } as AuthContextValue["user"],
    session: {} as AuthContextValue["session"],
    profile: { id: userId, username: "Tester" } as AuthContextValue["profile"],
    emailVerified: true,
  })
}

const activeRoots: ReturnType<typeof createRoot>[] = []
let mockController: ReturnType<typeof mockSupabaseFrom>

beforeEach(() => {
  mockController = mockSupabaseFrom()
})

afterEach(() => {
  mockController?.fromSpy.mockRestore()
  for (const root of activeRoots) {
    try {
      root.unmount()
    } catch {}
  }
  activeRoots.length = 0
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("StudioPage", () => {
  it("renders the 3D studio board with stage and rack panels", async () => {
    const host = document.createElement("div")
    const root = createRoot(host)
    activeRoots.push(root)

    await act(async () => {
      flushSync(() => {
        root.render(
          <AuthContext.Provider value={stubAuth("user-studio")}>
            <LikesProvider>
              <CatalogProvider>
                <WardrobeProvider>
                  <MemoryRouter initialEntries={["/studio"]}>
                    <StudioPage />
                  </MemoryRouter>
                </WardrobeProvider>
              </CatalogProvider>
            </LikesProvider>
          </AuthContext.Provider>,
        )
      })
      await Promise.resolve()
    })

    // Confirm studio board structure exists
    const board = host.querySelector(".studio-board")
    expect(board).not.toBeNull()

    // Confirm mock skin stage exists
    const stage = host.querySelector("[data-testid='mock-skin-stage']")
    expect(stage).not.toBeNull()

    // Confirm Collection and Assembly panels are rendered
    expect(host.textContent).toContain("Collection")
    expect(host.textContent).toContain("Assembly")
  })
})
