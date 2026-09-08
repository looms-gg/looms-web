import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, it, expect } from "vitest"
import { AuthProvider, useAuth, getAvatarUrl } from "./auth"


describe("auth module", () => {
  it("exports provider, hook, and helpers", () => {
    expect(typeof AuthProvider).toBe("function")
    expect(typeof useAuth).toBe("function")
    expect(typeof getAvatarUrl).toBe("function")
  })

  it("computes minotar helm url when minecraft_username is set", () => {
    expect(getAvatarUrl({ minecraft_username: "Steve", avatar_url: null })).toBe(
      "https://minotar.net/helm/Steve/128.png",
    )
  })

  it("prefers custom avatar_url over minecraft helm when both set", () => {
    expect(
      getAvatarUrl({
        minecraft_username: "Steve",
        avatar_url: "https://example.com/me.png",
      }),
    ).toBe("https://example.com/me.png")
  })

  it("uses custom avatar_url when minecraft_username is missing", () => {
    expect(
      getAvatarUrl({ minecraft_username: null, avatar_url: "https://example.com/me.png" }),
    ).toBe("https://example.com/me.png")
  })

  it("rejects unsafe javascript avatar_url and falls back to minecraft_username", () => {
    expect(
      getAvatarUrl({
        minecraft_username: "Steve",
        avatar_url: "javascript:alert('xss')",
      }),
    ).toBe("https://minotar.net/helm/Steve/128.png")

    expect(
      getAvatarUrl({
        minecraft_username: null,
        avatar_url: "javascript:alert('xss')",
      }),
    ).toBeNull()
  })

  it("returns null if no minecraft_username or avatar_url", () => {
    expect(getAvatarUrl(null)).toBeNull()
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

    expect(authVal).toBeDefined()
    expect(authVal.loading).toBe(true)
    expect(typeof authVal.signInWithPassword).toBe("function")
    expect(typeof authVal.signUpWithPassword).toBe("function")
    expect(typeof authVal.signInWithOtp).toBe("function")
    expect(typeof authVal.resendConfirmation).toBe("function")
    expect(authVal.emailVerified).toBe(false)
  })
})
