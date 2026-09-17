import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "./auth"
import { makeAuthStub } from "../test/authStub"
import { mockSupabaseFrom } from "../test/supabaseMock"
import { useIsAdmin } from "./useIsAdmin"

function mountIsAdmin(user: AuthContextValue["user"]) {
  let value!: boolean
  function HookCatcher() {
    value = useIsAdmin()
    return null
  }
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthContext.Provider value={makeAuthStub({ user })}>
        <HookCatcher />
      </AuthContext.Provider>,
    )
  })
  return { getIsAdmin: () => value, host }
}

const testUser = {
  id: "user-1",
  email: "user@example.com",
  email_confirmed_at: "2026-01-01T00:00:00Z",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
}

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("useIsAdmin", () => {
  it("derives the flag from the admin_users RLS probe", async () => {
    const from = mockSupabaseFrom()
    from.setDefaultHandler((query) => {
      throw new Error(`unexpected table ${query.table}`)
    })
    from.on("admin_users", { data: { user_id: testUser.id }, error: null })

    const { getIsAdmin } = mountIsAdmin(testUser as never)
    await vi.waitFor(() => {
      expect(getIsAdmin()).toBe(true)
    })
    expect(from.getQueries("admin_users", "select")).toHaveLength(1)
  })

  it("stays false when the probe finds no row or errors", async () => {
    const from = mockSupabaseFrom()
    from.setDefaultHandler((query) => {
      throw new Error(`unexpected table ${query.table}`)
    })
    from.on("admin_users", { data: null, error: null })

    const { getIsAdmin } = mountIsAdmin(testUser as never)
    await vi.waitFor(() => {
      expect(from.getQueries("admin_users", "select")).toHaveLength(1)
    })
    expect(getIsAdmin()).toBe(false)
  })

  it("is false without a user and never probes", async () => {
    const from = mockSupabaseFrom()
    const { getIsAdmin } = mountIsAdmin(null)
    expect(getIsAdmin()).toBe(false)
    expect(from.fromSpy).not.toHaveBeenCalled()
  })
})
