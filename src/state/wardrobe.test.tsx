import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { pieces } from "../data/catalog"
import { WardrobeProvider, useWardrobe, type Look } from "./wardrobe"
import * as authModule from "./auth"
import { supabase } from "../lib/supabase"
import type { AuthContextValue } from "./auth"
import { persistDefaults } from "./persist"

function stubAuth(userId: string | null): AuthContextValue {
  return {
    user: userId ? ({ id: userId, email: "test@looms.dev" } as AuthContextValue["user"]) : null,
    session: userId ? ({} as AuthContextValue["session"]) : null,
    profile: userId
      ? ({ id: userId, username: "Tester" } as AuthContextValue["profile"])
      : null,
    avatarUrl: null,
    loading: false,
    emailVerified: Boolean(userId),
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

function mockLooksTable(options?: { wardrobeIds?: string[] }) {
  const wardrobeIds = options?.wardrobeIds ?? []
  return vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "wardrobe_items") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: wardrobeIds.map((garment_id) => ({ garment_id })),
              error: null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never
    }
    return {
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as never
  })
}

describe("session module", () => {
  it("exports the provider and hook", () => {
    expect(typeof WardrobeProvider).toBe("function")
    expect(typeof useWardrobe).toBe("function")
  })

  it("handles loadLook, saveLook, and overwriteLook with activeLook tracking", async () => {
    mockLooksTable()
    let session!: ReturnType<typeof useWardrobe>

    function Consumer() {
      session = useWardrobe()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    // Let cloud looks/wardrobe fetches settle before local mutations
    await Promise.resolve()
    await Promise.resolve()

    // Save a new look
    flushSync(() => {
      session.saveLook("Custom Outfit")
    })

    expect(session.looks).toHaveLength(1)
    expect(session.looks[0].name).toBe("Custom Outfit")
    expect(session.activeLook?.name).toBe("Custom Outfit")
    const lookId = session.looks[0].id

    // Overwrite the look
    flushSync(() => {
      session.overwriteLook(lookId, "Updated Outfit")
    })

    expect(session.looks).toHaveLength(1)
    expect(session.looks[0].name).toBe("Updated Outfit")
    expect(session.activeLook?.name).toBe("Updated Outfit")

    // Load an existing look
    const mockLook: Look = {
      id: "look-2",
      name: "Loaded Skin",
      equipped: { hat: "hat-cap" },
      stack: ["hat-cap"],
      bodyId: persistDefaults.bodyId,
      bodyHue: 0,
      model: "classic",
      savedAt: 1000,
      description: "",
      visibility: "private",
    }

    flushSync(() => {
      session.loadLook(mockLook)
    })

    expect(session.activeLook?.id).toBe("look-2")
    expect(session.activeLook?.name).toBe("Loaded Skin")
    expect(session.equipped.hat).toBe("hat-cap")
  })

  it("sanitizes look name and limits length in saveLook and overwriteLook", async () => {
    mockLooksTable()
    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    await Promise.resolve()
    await Promise.resolve()

    flushSync(() => {
      session.saveLook("<script>alert(1)</script>Party Look")
    })

    expect(session.looks[0].name).toBe("Party Look")

    flushSync(() => {
      session.overwriteLook(session.looks[0].id, "B".repeat(100))
    })

    expect(session.looks[0].name.length).toBe(50)
  })

  it("saves looks as private with empty description", async () => {
    mockLooksTable()
    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    await Promise.resolve()
    await Promise.resolve()

    flushSync(() => {
      session.saveLook("Custom Outfit")
    })
    expect(session.looks[0].description).toBe("")
    expect(session.looks[0].visibility).toBe("private")
  })

  it("updates look meta without dropping layers", async () => {
    mockLooksTable()
    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    flushSync(() => {
      session.addToWardrobe("ash-crop")
    })
    await vi.waitFor(() => {
      expect(session.owns("ash-crop")).toBe(true)
    })
    flushSync(() => {
      session.wear("ash-crop")
      session.saveLook("Custom Outfit")
    })
    const id = session.looks[0].id
    flushSync(() => {
      session.updateLookMeta(id, {
        name: "  ",
        description: "Night market",
        visibility: "public",
      })
    })
    expect(session.looks[0].name).toBe("Custom Outfit")
    expect(session.looks[0].description).toBe("Night market")
    expect(session.looks[0].visibility).toBe("public")
    expect(session.looks[0].equipped.hair).toBe("ash-crop")
  })

  it("keeps description and visibility when overwriting a look", async () => {
    mockLooksTable()
    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })
    await Promise.resolve()
    await Promise.resolve()

    flushSync(() => {
      session.saveLook("Custom Outfit")
    })
    const id = session.looks[0].id
    flushSync(() => {
      session.updateLookMeta(id, {
        description: "Keep me",
        visibility: "public",
      })
      session.overwriteLook(id, "Updated Outfit")
    })
    expect(session.looks[0].name).toBe("Updated Outfit")
    expect(session.looks[0].description).toBe("Keep me")
    expect(session.looks[0].visibility).toBe("public")
  })

  it("persists looks to supabase when user is logged in", () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    vi.spyOn(supabase, "from").mockReturnValue({
      insert: insertSpy,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    } as any)

    const mockAuthVal = stubAuth("user-test-1")
    vi.spyOn(authModule, "useAuth").mockReturnValue(mockAuthVal)

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={mockAuthVal}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })

    flushSync(() => {
      session.saveLook("Cloud Cape Outfit")
    })

    expect(insertSpy).toHaveBeenCalled()
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-test-1",
        name: "Cloud Cape Outfit",
      }),
    )
  })

  it("clears in-wardrobe pieces on sign out and restores them from the cloud on sign in", async () => {
    const pieceId = pieces[0].id
    mockLooksTable({ wardrobeIds: [pieceId] })
    localStorage.clear()

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    function Harness({ userId }: { userId: string | null }) {
      return (
        <authModule.AuthContext.Provider value={stubAuth(userId)}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)

    flushSync(() => {
      root.render(<Harness userId="user-a" />)
    })
    await vi.waitFor(() => {
      expect(session.owns(pieceId)).toBe(true)
    })

    flushSync(() => {
      root.render(<Harness userId={null} />)
    })
    expect(session.owns(pieceId)).toBe(false)
    expect(session.owned).toEqual([])

    flushSync(() => {
      root.render(<Harness userId="user-a" />)
    })
    await vi.waitFor(() => {
      expect(session.owns(pieceId)).toBe(true)
    })
  })

  it("does not restore owned from localStorage on sign in", async () => {
    mockLooksTable({ wardrobeIds: [] })
    localStorage.clear()
    const pieceId = pieces[0].id
    localStorage.setItem(
      "looms.v2:user-a",
      JSON.stringify({ ...persistDefaults, owned: [pieceId] }),
    )

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    function Harness({ userId }: { userId: string | null }) {
      return (
        <authModule.AuthContext.Provider value={stubAuth(userId)}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)

    flushSync(() => {
      root.render(<Harness userId={null} />)
    })
    expect(session.owned).toEqual([])

    flushSync(() => {
      root.render(<Harness userId="user-a" />)
    })
    await vi.waitFor(() => {
      expect(session.owned).toEqual([])
    })
    expect(session.owns(pieceId)).toBe(false)
  })

  it("does not add to wardrobe when signed out", () => {
    mockLooksTable()
    localStorage.clear()
    const pieceId = pieces[0].id

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth(null)}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })

    flushSync(() => {
      session.addToWardrobe(pieceId)
    })
    expect(session.owns(pieceId)).toBe(false)
  })

  it("inserts wardrobe_items then owns the piece when signed in", async () => {
    const pieceId = pieces[0].id
    const fromSpy = mockLooksTable({ wardrobeIds: [] })
    localStorage.clear()

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })

    flushSync(() => {
      session.addToWardrobe(pieceId)
    })

    await vi.waitFor(() => {
      expect(session.owns(pieceId)).toBe(true)
    })
    expect(fromSpy).toHaveBeenCalledWith("wardrobe_items")
  })

  it("does not persist guest looks across remount", () => {
    mockLooksTable()
    localStorage.clear()

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    function Harness({ userId }: { userId: string | null }) {
      return (
        <authModule.AuthContext.Provider value={stubAuth(userId)}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>
      )
    }

    const host = document.createElement("div")
    const root = createRoot(host)

    flushSync(() => {
      root.render(<Harness userId={null} />)
    })

    flushSync(() => {
      session.saveLook("Guest Adventure Look")
    })
    // Guest saves are ignored (browse-only)
    expect(session.looks).toEqual([])

    root.unmount()
    const host2 = document.createElement("div")
    const newRoot = createRoot(host2)
    flushSync(() => {
      newRoot.render(<Harness userId={null} />)
    })
    expect(session.looks).toEqual([])
    expect(localStorage.getItem("looms.v2:guest")).toBeNull()
    expect(localStorage.getItem("looms.v2")).toBeNull()
  })

  it("does not restore studio equipped state from localStorage on remount", async () => {
    const pieceId = pieces[0].id
    mockLooksTable({ wardrobeIds: [pieceId] })
    localStorage.clear()

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    function Harness() {
      return (
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>
      )
    }

    const host = document.createElement("div")
    let root = createRoot(host)
    flushSync(() => {
      root.render(<Harness />)
    })

    await vi.waitFor(() => {
      expect(session.owns(pieceId)).toBe(true)
    })

    flushSync(() => {
      session.wear(pieceId)
    })
    expect(session.equipped[pieces[0].slot]).toBe(pieceId)

    root.unmount()
    const host2 = document.createElement("div")
    root = createRoot(host2)
    flushSync(() => {
      root.render(<Harness />)
    })

    await vi.waitFor(() => {
      expect(session.owns(pieceId)).toBe(true)
    })
    expect(session.equipped[pieces[0].slot]).toBeUndefined()
    expect(localStorage.getItem("looms.v2:user-a")).toBeNull()
  })

  it("hydrates equipped slots from stack when loading cloud looks", async () => {
    localStorage.clear()
    const pieceId = pieces[0].id
    vi.spyOn(supabase, "from").mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: "cloud-look-1",
                name: "Winter Fit",
                stack: [pieceId],
                body_id: "slate",
                body_hue: 0,
                model: "classic",
                created_at: new Date().toISOString(),
                description: "Snowy day",
                visibility: "public",
              },
            ],
            error: null,
          }),
        }),
      }),
    } as never)

    let session!: ReturnType<typeof useWardrobe>
    function Consumer() {
      session = useWardrobe()
      return null
    }

    const host = document.createElement("div")
    const root = createRoot(host)

    flushSync(() => {
      root.render(
        <authModule.AuthContext.Provider value={stubAuth("user-a")}>
          <WardrobeProvider>
            <Consumer />
          </WardrobeProvider>
        </authModule.AuthContext.Provider>,
      )
    })

    // Wait for promise resolution of cloud looks fetch
    await vi.waitFor(() => {
      expect(session.looks.length).toBe(1)
    })

    expect(session.looks[0].equipped[pieces[0].slot]).toBe(pieceId)
  })
})
