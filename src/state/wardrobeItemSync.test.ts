import { describe, expect, it, vi } from "vitest"
import { supabase } from "../lib/supabase"
import {
  fetchCloudWardrobeGarmentIds,
  insertCloudWardrobeItem,
  deleteCloudWardrobeItem,
} from "./wardrobeItemSync"

describe("wardrobeItemSync", () => {
  describe("fetchCloudWardrobeGarmentIds", () => {
    it("returns garment IDs for user", async () => {
      const order = vi.fn().mockResolvedValue({
        data: [{ garment_id: "hat_1" }, { garment_id: "shirt_2" }],
        error: null,
      })
      const eq = vi.fn().mockReturnValue({ order })
      const select = vi.fn().mockReturnValue({ eq })
      vi.spyOn(supabase, "from").mockReturnValue({ select } as never)

      const result = await fetchCloudWardrobeGarmentIds("u1")
      expect(result).toEqual(["hat_1", "shirt_2"])
      expect(supabase.from).toHaveBeenCalledWith("wardrobe_items")
      expect(eq).toHaveBeenCalledWith("user_id", "u1")
      expect(order).toHaveBeenCalledWith("created_at", { ascending: false })
    })

    it("throws when query returns error", async () => {
      const order = vi.fn().mockResolvedValue({
        data: null,
        error: new Error("Network failure"),
      })
      const eq = vi.fn().mockReturnValue({ order })
      const select = vi.fn().mockReturnValue({ eq })
      vi.spyOn(supabase, "from").mockReturnValue({ select } as never)

      await expect(fetchCloudWardrobeGarmentIds("u1")).rejects.toThrow("Network failure")
    })
  })

  describe("insertCloudWardrobeItem", () => {
    it("returns ok when insert succeeds", async () => {
      const insert = vi.fn().mockResolvedValue({ error: null })
      vi.spyOn(supabase, "from").mockReturnValue({ insert } as never)

      const res = await insertCloudWardrobeItem("u1", "garment_1")
      expect(res).toEqual({ status: "ok" })
      expect(insert).toHaveBeenCalledWith({ user_id: "u1", garment_id: "garment_1" })
    })

    it("returns dup when Postgres unique constraint 23505 is raised", async () => {
      const insert = vi.fn().mockResolvedValue({
        error: { code: "23505", message: "duplicate key value" },
      })
      vi.spyOn(supabase, "from").mockReturnValue({ insert } as never)

      const res = await insertCloudWardrobeItem("u1", "garment_1")
      expect(res).toEqual({ status: "dup" })
    })

    it("returns fail with error message on unexpected error", async () => {
      const insert = vi.fn().mockResolvedValue({
        error: { code: "42000", message: "permission denied" },
      })
      vi.spyOn(supabase, "from").mockReturnValue({ insert } as never)

      const res = await insertCloudWardrobeItem("u1", "garment_1")
      expect(res.status).toBe("fail")
      expect(res.errorMessage).toBeDefined()
    })
  })

  describe("deleteCloudWardrobeItem", () => {
    it("returns no error when delete succeeds", async () => {
      const eqSecond = vi.fn().mockResolvedValue({ error: null })
      const eqFirst = vi.fn().mockReturnValue({ eq: eqSecond })
      const del = vi.fn().mockReturnValue({ eq: eqFirst })
      vi.spyOn(supabase, "from").mockReturnValue({ delete: del } as never)

      const res = await deleteCloudWardrobeItem("u1", "garment_1")
      expect(res).toEqual({ error: null })
      expect(eqFirst).toHaveBeenCalledWith("user_id", "u1")
      expect(eqSecond).toHaveBeenCalledWith("garment_id", "garment_1")
    })

    it("returns error when delete fails", async () => {
      const eqSecond = vi.fn().mockResolvedValue({
        error: { message: "Row locked" },
      })
      const eqFirst = vi.fn().mockReturnValue({ eq: eqSecond })
      const del = vi.fn().mockReturnValue({ eq: eqFirst })
      vi.spyOn(supabase, "from").mockReturnValue({ delete: del } as never)

      const res = await deleteCloudWardrobeItem("u1", "garment_1")
      expect(res.error?.message).toBe("Row locked")
      expect(res.errorMessage).toBeDefined()
    })
  })
})

