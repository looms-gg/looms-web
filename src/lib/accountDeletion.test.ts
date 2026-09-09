import { beforeEach, describe, expect, it, vi } from "vitest"
import { supabase } from "./supabase"
import { requestAccountDeletion } from "./accountDeletion"

describe("requestAccountDeletion", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("returns null error when the RPC succeeds", async () => {
    const rpc = vi.spyOn(supabase, "rpc").mockResolvedValue({ data: null, error: null } as never)
    const { error } = await requestAccountDeletion()
    expect(rpc).toHaveBeenCalledWith("delete_my_account")
    expect(error).toBeNull()
  })

  it("surfaces the RPC error for display", async () => {
    vi
      .spyOn(supabase, "rpc")
      .mockResolvedValue({ data: null, error: { message: "delete_my_account: not authenticated" } } as never)
    const { error } = await requestAccountDeletion()
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/not authenticated/i)
  })
})
