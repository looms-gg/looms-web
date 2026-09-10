import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { supabase } from "../../lib/supabase"
import { AuthContext, type AuthContextValue } from "../../state/auth"
import { useProfileImageUpload } from "./useProfileImageUpload"

function stubAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    session: null,
    profile: {
      id: "u1",
      username: "PixelWeaver",
      minecraft_username: null,
      bio: null,
      avatar_url: null,
      banner_url: null,
      last_seen_at: null,
      show_last_seen: true,
      show_likes: true,
      username_changed_at: null,
      created_at: "",
      updated_at: "",
    } as AuthContextValue["profile"],
    avatarUrl: null,
    loading: false,
    emailVerified: true,
    pendingEmail: null,
    emailVerifyOpen: false,
    openEmailVerify: vi.fn(),
    dismissEmailVerify: vi.fn(),
    resendConfirmation: vi.fn(),
    signInWithPassword: vi.fn(),
    signUpWithPassword: vi.fn(),
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    deleteAccount: vi.fn(),
    updateProfile: vi.fn(async () => ({ error: null })),
    refreshProfile: vi.fn(),
    profileError: null,
    dismissProfileError: vi.fn(),
    ...overrides,
  }
}

function mountWithAuth(auth: AuthContextValue) {
  let hook!: ReturnType<typeof useProfileImageUpload>
  function Catcher() {
    hook = useProfileImageUpload()
    return null
  }
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthContext.Provider value={auth}>
        <Catcher />
      </AuthContext.Provider>,
    )
  })
  return { getHook: () => hook, host }
}

describe("useProfileImageUpload", () => {
  it("uploads, updates the profile, and reports success", async () => {
    const from = vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://x.test/a.png" } }),
    } as never)
    const updateProfile = vi.fn(async () => ({ error: null }))
    const { getHook } = mountWithAuth(stubAuth({ updateProfile }))

    const ok = await getHook().upload(
      "avatar",
      new File([new Uint8Array(4)], "a.png", { type: "image/png" }),
    )

    expect(ok).toBe(true)
    expect(from).toHaveBeenCalled()
    expect(updateProfile).toHaveBeenCalledWith({ avatar_url: "https://x.test/a.png" })
    expect(getHook().errorMsg).toBeNull()
    expect(getHook().uploading).toBeNull()
  })

  it("surfaces failures without throwing", async () => {
    vi.spyOn(supabase.storage, "from").mockReturnValue({
      upload: vi.fn().mockResolvedValue({ error: { message: "storage down" } }),
    } as never)
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const { getHook } = mountWithAuth(stubAuth())

    const ok = await getHook().upload(
      "banner",
      new File([new Uint8Array(4)], "b.png", { type: "image/png" }),
    )

    expect(ok).toBe(false)
    expect(getHook().errorMsg).toMatch(/storage down/i)
    errSpy.mockRestore()
  })
})
