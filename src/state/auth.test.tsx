import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, it, expect } from "vitest"
import { AuthProvider, useAuth } from "./auth"

describe("auth module", () => {
  it("exports provider and hook", () => {
    expect(typeof AuthProvider).toBe("function")
    expect(typeof useAuth).toBe("function")
  })

  it("renders inside AuthProvider with initial loading state", () => {
    let authVal!: ReturnType<typeof useAuth>
    function HookCatcher() {
      authVal = useAuth()
      return null
    }
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <HookCatcher />
        </AuthProvider>,
      )
    })
    expect(authVal.loading).toBe(true)
    expect(authVal.user).toBeNull()
  })
})
