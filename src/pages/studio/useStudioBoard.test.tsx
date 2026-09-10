import { beforeEach, describe, expect, it, vi } from "vitest"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import {
  filledSlots,
  ownedBySlotMap,
  pickBodyTone,
  useStudioBoard,
} from "./useStudioBoard"
import { WardrobeProvider, useWardrobe, type Look } from "../../state/wardrobe"
import { CatalogProvider } from "../../state/catalog"
import * as authModule from "../../state/auth"
import type { AuthContextValue } from "../../state/auth"
import { supabase } from "../../lib/supabase"

function stubAuth(userId: string): AuthContextValue {
  return {
    user: { id: userId, email: "test@looms.dev" } as AuthContextValue["user"],
    session: {} as AuthContextValue["session"],
    profile: { id: userId, username: "Tester" } as AuthContextValue["profile"],
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
    deleteAccount: vi.fn(),
  }
}

function mockCloudSession() {
  vi.spyOn(supabase, "from").mockImplementation(() => {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as never
  })
}

describe("ownedBySlotMap", () => {
  it("starts empty for every slot", () => {
    const map = ownedBySlotMap([])
    expect(filledSlots(map)).toEqual([])
  })
})

describe("pickBodyTone", () => {
  it("retoggles hue on the current body and switches otherwise", () => {
    const hues: boolean[] = []
    const bodies: string[] = []
    pickBodyTone(
      "a",
      "a",
      (id) => bodies.push(id),
      (update) => {
        const next = typeof update === "function" ? update(false) : update
        hues.push(next)
      },
    )
    pickBodyTone(
      "b",
      "a",
      (id) => bodies.push(id),
      (update) => {
        const next = typeof update === "function" ? update(true) : update
        hues.push(next)
      },
    )
    expect(hues).toEqual([true, false])
    expect(bodies).toEqual(["b"])
  })
})

describe("useStudioBoard name loading", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    mockCloudSession()
  })

  it("loads previously saved look name when a look is saved", async () => {
    let board!: ReturnType<typeof useStudioBoard>
    let session!: ReturnType<typeof useWardrobe>

    function Harness() {
      session = useWardrobe()
      board = useStudioBoard()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <CatalogProvider>
            <WardrobeProvider>
              <Harness />
            </WardrobeProvider>
          </CatalogProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    await Promise.resolve()
    await Promise.resolve()

    expect(board.name).toBe("")

    flushSync(() => {
      session.saveLook("Winter Explorer")
    })

    expect(board.name).toBe("Winter Explorer")
  })

  it("loads the previous name when loading a saved look", () => {
    let board!: ReturnType<typeof useStudioBoard>
    let session!: ReturnType<typeof useWardrobe>

    function Harness() {
      session = useWardrobe()
      board = useStudioBoard()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <CatalogProvider>
            <WardrobeProvider>
              <Harness />
            </WardrobeProvider>
          </CatalogProvider>
        </authModule.AuthContext.Provider>,
      )
    })

    const mockLook: Look = {
      id: "look-99",
      name: "Cyber Punk",
      equipped: { shirt: "open-plaid-shirt" },
      stack: ["open-plaid-shirt"],
      bodyId: "body-4",
      bodyHue: 0,
      model: "classic",
      savedAt: 12345,
      description: "",
      visibility: "private",
    }

    flushSync(() => {
      session.loadLook(mockLook)
    })

    expect(board.name).toBe("Cyber Punk")
  })

  it("keeps the matching look name when activeLook is cleared but outfit still matches", async () => {
    let board!: ReturnType<typeof useStudioBoard>
    let session!: ReturnType<typeof useWardrobe>

    function Harness() {
      session = useWardrobe()
      board = useStudioBoard()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <CatalogProvider>
            <WardrobeProvider>
              <Harness />
            </WardrobeProvider>
          </CatalogProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    await Promise.resolve()
    await Promise.resolve()

    const look: Look = {
      id: "look-match",
      name: "Cozy Sweaters",
      equipped: { coat: "winter-coat" },
      stack: ["winter-coat"],
      bodyId: "slate",
      bodyHue: 0,
      model: "classic",
      savedAt: 1234,
      description: "",
      visibility: "private",
    }

    flushSync(() => {
      session.loadLook(look)
    })
    expect(board.name).toBe("Cozy Sweaters")

    flushSync(() => {
      session.setActiveLook(null)
    })
    expect(board.name).toBe("Cozy Sweaters")
  })
})
