import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { AuthContext, type AuthContextValue } from "../../state/auth"
import { uploadProfileImage } from "../profile/uploadProfileImage"
import { useProfileImageUpload } from "./useProfileImageUpload"

vi.mock("../profile/uploadProfileImage", () => ({
  uploadProfileImage: vi.fn(),
}))

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
    isAdmin: false,
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
    resetPasswordForEmail: vi.fn(),
    signOut: vi.fn(),
    deleteAccount: vi.fn(),
    signInWithOAuth: vi.fn(),
    completeOnboarding: vi.fn(),
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
    vi.mocked(uploadProfileImage).mockResolvedValue("https://x.test/a.png")
    const updateProfile = vi.fn(async () => ({ error: null }))
    const { getHook } = mountWithAuth(stubAuth({ updateProfile }))

    let ok = false
    await act(async () => {
      ok = await getHook().upload(
        "avatar",
        new File([new Uint8Array(4)], "a.png", { type: "image/png" }),
      )
    })

    expect(ok).toBe(true)
    expect(uploadProfileImage).toHaveBeenCalledWith(
      "u1",
      "avatar",
      expect.any(File),
      undefined,
    )
    expect(updateProfile).toHaveBeenCalledWith({ avatar_url: "https://x.test/a.png" })
    expect(getHook().errorMsg).toBeNull()
    expect(getHook().uploading).toBeNull()
  })

  it("surfaces failures without throwing", async () => {
    vi.mocked(uploadProfileImage).mockRejectedValue(new Error("storage down"))
    const { getHook } = mountWithAuth(stubAuth())

    let ok = true
    await act(async () => {
      ok = await getHook().upload(
        "banner",
        new File([new Uint8Array(4)], "b.png", { type: "image/png" }),
      )
    })

    expect(ok).toBe(false)
    expect(getHook().errorMsg).toMatch(/storage down/i)
  })
})
