import { describe, it, expect } from "vitest"
import { supabase } from "./supabase"

describe("supabase client", () => {
  it("exports an initialized client", () => {
    expect(supabase).toBeDefined()
    expect(supabase.auth).toBeDefined()
    expect(supabase.from).toBeDefined()
    expect(supabase.storage).toBeDefined()
  })
})
