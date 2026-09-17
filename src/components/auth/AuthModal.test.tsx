import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AuthModal, type AuthModalProps } from "./AuthModal"
import type { AuthContextValue } from "../../state/auth"
import { makeAuthStub } from "../../test/authStub"

const baseAuth: Record<string, unknown> = {
  ...makeAuthStub({
    signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signUpWithPassword: vi.fn().mockResolvedValue({ error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    completeOnboarding: vi.fn().mockResolvedValue({ error: null }),
  }),
  connections: [],
  unlinkConnection: vi.fn().mockResolvedValue({ error: null }),
  setConnectionFeatured: vi.fn().mockResolvedValue({ error: null }),
}

vi.mock("../../state/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../state/auth")>()
  return {
    ...actual,
    useAuthOptional: () => baseAuth as unknown as AuthContextValue,
  }
})

vi.mock("../../lib/auth/turnstile", () => ({ isTurnstileEnabled: () => false }))

function mountModal(overrides?: Partial<AuthModalProps>) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(
      <AuthModal
        isOpen
        isGate={false}
        onClose={() => {}}
        {...overrides}
      />,
    )
  })
  return { host, root }
}

function submitForm(host: HTMLElement) {
  host
    .querySelector("form")!
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }))
}

describe("AuthModal", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("renders three OAuth provider buttons on login and signup", () => {
    for (const mode of ["login", "signup"] as const) {
      const { root } = mountModal({ initialMode: mode })
      const labels = [...document.body.querySelectorAll("button")].map((b) => b.textContent)
      expect(labels).toContain("Discord")
      expect(labels).toContain("Google")
      expect(labels).toContain("GitHub")
      expect(labels).not.toContain("Microsoft")
      flushSync(() => root.unmount())
    }
  })

  it("signup step one has no username field; step two shows it", async () => {
    const { root } = mountModal({ initialMode: "signup" })
    expect(document.body.querySelector("input[name=username]")).toBeNull()

    const email = document.body.querySelector<HTMLInputElement>("input[name=email]")!
    const password = document.body.querySelector<HTMLInputElement>("input[name=password]")!
    await act(async () => {
      email.value = "weaver@looms.dev"
      password.value = "hunter22"
      submitForm(document.body)
      await Promise.resolve()
    })
    flushSync(() => {})

    expect(document.body.querySelector("input")).not.toBeNull()
    expect(document.body.textContent).toContain("Pick your username")
    flushSync(() => root.unmount())
  })
})
