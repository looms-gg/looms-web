import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { replaceCatalog, type Piece } from "../data/catalog"
import { fixturePieces } from "../data/catalogSeed"
import { piecesFromEquipped } from "../data/outfit"
import { ClosetProvider, useCloset } from "./closet"
import { CatalogProvider, mapGarmentEmbed } from "./catalog"
import * as authModule from "./auth"
import type { AuthContextValue } from "./auth"
import { supabase } from "../lib/supabase"
import type { GarmentRow } from "../lib/supabase"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
  // Restore the shared fixture registry for later tests.
  replaceCatalog(fixturePieces())
})

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
  } as unknown as AuthContextValue
}

const RACE_LOOK_ROW = {
  id: "look-race",
  user_id: "user-a",
  name: "Race look",
  description: "",
  visibility: "private",
  stack: ["upload-1", "bear-hat"],
  body_id: "body-1",
  body_hue: 0,
  model: "classic",
  created_at: "2026-09-08T00:00:00.000Z",
  updated_at: "2026-09-08T00:00:00.000Z",
}

function makeGarmentRow(overrides: Partial<GarmentRow> = {}): GarmentRow {
  return {
    id: "upload-1",
    user_id: "user-a",
    name: "Test Upload",
    description: null,
    slot: "shirt",
    body_group: "torso",
    saved_count: 0,
    like_count: 0,
    added: 0,
    covers: [],
    texture_url: "https://example.test/upload.png",
    is_public: false,
    tags: [],
    created_at: "2026-09-08T00:00:00.000Z",
    ...overrides,
  }
}

/** One supabase.from mock that answers every table the providers touch. */
function mockSupabaseTables(options: {
  lookRows: unknown[]
  garments: () => { data: unknown; error: unknown }
  wardrobeIds?: string[]
}) {
  const ordered = (data: unknown, error: unknown) =>
    vi.fn().mockResolvedValue({ data, error })
  return vi.spyOn(supabase, "from").mockImplementation((table: string) => {
    if (table === "looks") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: ordered(options.lookRows, null),
          }),
        }),
      } as never
    }
    if (table === "wardrobe_items") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: ordered(
              (options.wardrobeIds ?? []).map((garment_id) => ({ garment_id })),
              null,
            ),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      } as never
    }
    if (table === "garments") {
      const { data, error } = options.garments()
      const order = ordered(data, error)
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ order }),
          or: vi.fn().mockReturnValue({ order }),
        }),
      } as never
    }
    return {} as never
  })
}

describe("catalog hydration race", () => {
  it("heals looks that hydrated before their pieces joined the catalog registry", async () => {
    // Catalog fetch fails: the registry stays without the private upload.
    mockSupabaseTables({
      lookRows: [RACE_LOOK_ROW],
      garments: () => ({ data: null, error: { message: "boom" } }),
    })

    // The registry knows the hat but not the upload yet.
    const upload: Piece = mapGarmentEmbed(makeGarmentRow())
    replaceCatalog(fixturePieces().filter((piece) => piece.id !== upload.id))

    let session!: ReturnType<typeof useCloset>
    function Consumer() {
      session = useCloset()
      return null
    }

    const host = document.createElement("div")
    const root: Root = createRoot(host)
    const renderTree = () => {
      flushSync(() => {
        root.render(
          <authModule.AuthContext.Provider value={stubAuth("user-a")}>
            <CatalogProvider>
              <ClosetProvider>
                <Consumer />
              </ClosetProvider>
            </CatalogProvider>
          </authModule.AuthContext.Provider>,
        )
      })
    }

    renderTree()

    await vi.waitFor(() => {
      expect(session.looks.length).toBe(1)
    })

    const look = session.looks[0]
    expect(look.stack).toEqual(["upload-1", "bear-hat"])
    // upload-1 is missing from the registry → outfit resolves to the hat only.
    const nakedIds = piecesFromEquipped(look.equipped, look.stack).map((p) => p.id)
    expect(nakedIds).toEqual(["bear-hat"])

    // The catalog later loads with the private upload attached.
    replaceCatalog([...fixturePieces(), upload])

    // Same look object, no refresh: healing fills the snapshot gap from the stack.
    const healedIds = piecesFromEquipped(look.equipped, look.stack).map((p) => p.id)
    expect(healedIds).toContain("upload-1")
    expect(healedIds).toContain("bear-hat")

    root.unmount()
  })

  it("retries the catalog load with backoff after a failed fetch", async () => {
    vi.useFakeTimers()
    try {
      let attempts = 0
      mockSupabaseTables({
        lookRows: [],
        garments: () => {
          attempts++
          return attempts < 3
            ? { data: null, error: { message: "boom" } }
            : { data: [makeGarmentRow({ is_public: true })], error: null }
        },
      })

      replaceCatalog([])

      const host = document.createElement("div")
      const root: Root = createRoot(host)
      flushSync(() => {
        root.render(
          <authModule.AuthContext.Provider value={stubAuth(null)}>
            <CatalogProvider>
              <div />
            </CatalogProvider>
          </authModule.AuthContext.Provider>,
        )
      })

      // Attempt 1 fails → 1.5s backoff → attempt 2 fails → 4s → attempt 3 works.
      await vi.advanceTimersByTimeAsync(100)
      expect(attempts).toBe(1)
      await vi.advanceTimersByTimeAsync(1600)
      expect(attempts).toBe(2)
      await vi.advanceTimersByTimeAsync(4100)
      expect(attempts).toBe(3)

      // The registry is populated by the successful attempt.
      expect(piecesFromEquipped({}, ["upload-1"]).map((p) => p.id)).toEqual(["upload-1"])

      root.unmount()
    } finally {
      vi.useRealTimers()
    }
  })
})
