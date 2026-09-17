import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { OnboardingGate } from "./OnboardingGate"
import type { AuthContextValue } from "../../state/auth"
import { makeAuthStub } from "../../test/authStub"

const state = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))

vi.mock("../../state/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../state/auth")>()
  return {
    ...actual,
    useAuthOptional: () => state.value as AuthContextValue | null,
  }
})

const baseAuth: Record<string, unknown> = makeAuthStub({
  user: {
    id: "u1",
    email: "a@b.c",
    user_metadata: { global_name: "PixelWeaver" },
  } as unknown as AuthContextValue["user"],
  emailVerified: true,
  profile: { onboarding_complete: false, username: "user" } as AuthContextValue["profile"],
  completeOnboarding: vi.fn().mockResolvedValue({ error: null }),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
  signOut: vi.fn().mockResolvedValue({ error: null }),
})

function mountGate(authValue: Record<string, unknown> | null) {
  state.value = authValue
  const host = document.createElement("div")
  document.body.appendChild(host)
  flushSync(() => {
    createRoot(host).render(<OnboardingGate />)
  })
  return host
}

describe("OnboardingGate", () => {
  afterEach(() => {
    state.value = null
    document.body.innerHTML = ""
    vi.clearAllMocks()
  })

  it("renders the username step prefilled from OAuth metadata", () => {
    mountGate({ ...baseAuth })
    const input = document.body.querySelector<HTMLInputElement>("input")!
    expect(input.value).toBe("PixelWeaver")
    expect(document.body.textContent).toContain("One last step")
  })

  it("renders nothing when onboarding is complete", () => {
    mountGate({
      ...baseAuth,
      profile: { onboarding_complete: true, username: "weaver" },
    })
    expect(document.body.querySelector("input")).toBeNull()
  })

  it("renders nothing while email is unverified (verify modal owns that phase)", () => {
    mountGate({ ...baseAuth, emailVerified: false })
    expect(document.body.querySelector("input")).toBeNull()
  })

  it("submits the username through completeOnboarding", async () => {
    mountGate({ ...baseAuth })
    const input = document.body.querySelector<HTMLInputElement>("input")!
    input.value = "PixelWeaver"
    await act(async () => {
      document.body
        .querySelector("form")!
        .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))
      await Promise.resolve()
    })
    expect(baseAuth.completeOnboarding).toHaveBeenCalledWith("PixelWeaver")
  })
})
