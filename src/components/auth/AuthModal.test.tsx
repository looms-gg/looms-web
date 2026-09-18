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

const turnstileMock = vi.hoisted(() => ({ enabled: false }))

vi.mock("../../lib/auth/turnstile", () => ({
  isTurnstileEnabled: () => turnstileMock.enabled,
  loadTurnstileScript: () => Promise.resolve(),
  resolveTurnstileSiteKey: () => (turnstileMock.enabled ? "site-key" : null),
  _resetTurnstileScriptPromiseForTests: () => {},
}))

function installFakeTurnstile(emitToken = true) {
  const widget = {
    render: vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      if (emitToken) options.callback("token-abc")
      return "w1"
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  ;(window as unknown as { turnstile?: unknown }).turnstile = widget
  return widget
}

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
    turnstileMock.enabled = false
    delete (window as unknown as { turnstile?: unknown }).turnstile
    vi.clearAllMocks()
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("signup passes the captcha token from step one to signUpWithPassword", async () => {
    turnstileMock.enabled = true
    const widget = installFakeTurnstile()
    const { root } = mountModal({ initialMode: "signup" })
    await act(async () => {})

    const email = document.body.querySelector<HTMLInputElement>("input[name=email]")!
    const password = document.body.querySelector<HTMLInputElement>("input[name=password]")!
    await act(async () => {
      email.value = "weaver@looms.dev"
      password.value = "hunter22"
      submitForm(document.body)
      await Promise.resolve()
    })
    flushSync(() => {})

    expect(document.body.textContent).toContain("Pick your username")

    const username = document.body.querySelector<HTMLInputElement>("input")!
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )!.set!.call(username, "weaver")
      username.dispatchEvent(new Event("input", { bubbles: true }))
      submitForm(document.body)
      await Promise.resolve()
    })
    flushSync(() => {})

    expect(baseAuth.signUpWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ captchaToken: "token-abc" }),
    )
    // Step one never contacts the server, so the token must not be reset there.
    expect(widget.reset).not.toHaveBeenCalled()
    flushSync(() => root.unmount())
  })

  it("blocks submit when captcha is enabled but unverified", async () => {
    turnstileMock.enabled = true
    installFakeTurnstile(false)
    const { root } = mountModal({ initialMode: "signup" })

    const email = document.body.querySelector<HTMLInputElement>("input[name=email]")!
    const password = document.body.querySelector<HTMLInputElement>("input[name=password]")!
    await act(async () => {
      email.value = "weaver@looms.dev"
      password.value = "hunter22"
      submitForm(document.body)
      await Promise.resolve()
    })
    flushSync(() => {})

    expect(document.body.textContent).toContain("Please complete the captcha before continuing.")
    expect(document.body.textContent).not.toContain("Pick your username")
    expect(baseAuth.signUpWithPassword).not.toHaveBeenCalled()
    flushSync(() => root.unmount())
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
