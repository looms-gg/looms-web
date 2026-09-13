import { afterEach, describe, expect, it } from "vitest"
import { supabase } from "../lib/supabase"
import { mockSupabaseFrom } from "./supabaseMock"

describe("mockSupabaseFrom", () => {
  let mock: ReturnType<typeof mockSupabaseFrom>

  afterEach(() => {
    mock?.fromSpy.mockRestore()
  })

  it("records select queries and filters without coupling to chain order", async () => {
    mock = mockSupabaseFrom()
    mock.on("garments", "select", {
      data: [{ id: "g1", name: "Beanie" }],
      error: null,
    })

    const result = await supabase
      .from("garments")
      .select("id, name")
      .eq("slot", "hat")
      .order("created_at", { ascending: false })
      .limit(10)

    expect(result.data).toEqual([{ id: "g1", name: "Beanie" }])
    expect(result.error).toBeNull()

    const queries = mock.getQueries("garments", "select")
    expect(queries).toHaveLength(1)
    expect(queries[0].table).toBe("garments")
    expect(queries[0].operation).toBe("select")
    expect(queries[0].filters).toEqual([{ method: "eq", args: ["slot", "hat"] }])
    expect(queries[0].ordering).toEqual({ column: "created_at", options: { ascending: false } })
    expect(queries[0].limitCount).toBe(10)
  })

  it("handles mutation operations and records payloads", async () => {
    mock = mockSupabaseFrom()
    mock.on("likes", "insert", { data: null, error: null })

    const insertResult = await supabase
      .from("likes")
      .insert({ user_id: "u1", target_id: "g1", target_type: "garment" })

    expect(insertResult.error).toBeNull()

    const queries = mock.getQueries("likes", "insert")
    expect(queries).toHaveLength(1)
    expect(queries[0].payload).toEqual({
      values: { user_id: "u1", target_id: "g1", target_type: "garment" },
      options: undefined,
    })
  })

  it("supports dynamic query handlers based on recorded query", async () => {
    mock = mockSupabaseFrom()
    mock.on("profiles", (query) => {
      const isIdQuery = query.filters.some(
        (f) => f.method === "eq" && f.args[0] === "id" && f.args[1] === "u1",
      )
      if (isIdQuery) {
        return { data: [{ id: "u1", username: "Alice" }], error: null }
      }
      return { data: [], error: null }
    })

    const found = await supabase.from("profiles").select("*").eq("id", "u1").maybeSingle()
    expect(found.data).toEqual([{ id: "u1", username: "Alice" }])

    const missing = await supabase.from("profiles").select("*").eq("id", "u999")
    expect(missing.data).toEqual([])
  })
})
