import { describe, expect, it, vi, afterEach } from "vitest"
import { supabase } from "../lib/supabase"
import { loadGarments } from "./catalog"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("loadGarments", () => {
  it("maps public rows with profile usernames", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "ash-crop",
          user_id: "45e6be54-c9a5-4627-af39-9c14b27ec92e",
          name: "Ash Crop",
          description: "Mud-brown crop.",
          slot: "hair",
          body_group: "head",
          saved_count: 61,
          like_count: 2,
          added: 18,
          covers: [],
          texture_url: "https://example.test/ash-crop.png",
          is_public: true,
          tags: [],
          created_at: "2026-09-07T00:00:00.000Z",
          profiles: { username: "ser0th" },
        },
      ],
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ order })
    const select = vi.fn().mockReturnValue({ eq, or: vi.fn().mockReturnValue({ order }) })
    vi.spyOn(supabase, "from").mockReturnValue({ select } as never)

    const pieces = await loadGarments(null)
    expect(supabase.from).toHaveBeenCalledWith("garments")
    expect(eq).toHaveBeenCalledWith("is_public", true)
    expect(pieces).toHaveLength(1)
    expect(pieces[0]?.maker).toBe("ser0th")
    expect(pieces[0]?.group).toBe("head")
  })
})
