import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { act } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { supabase } from "../../lib/supabase"
import { AuthProvider } from "../../state/auth"
import { AuthModal } from "./AuthModal"

vi.mock("../../lib/turnstile", () => ({
  isTurnstileEnabled: () => true,
  resolveTurnstileSiteKey: () => "test-site-key",
  loadTurnstileScript: () => Promise.resolve(),
}))

type FakeTurnstile = {
  render: ReturnType<typeof vi.fn>
  reset: ReturnType<typeof vi.fn>
  remove: ReturnType<typeof vi.fn>
}

function stubTurnstile() {
  let captured: { callback: (token: string) => void } | null = null
  const fake: FakeTurnstile = {
    render: vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      captured = options
      return "widget-1"
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  }
  ;(window as unknown as { turnstile: FakeTurnstile }).turnstile = fake
  return {
    fake,
    issueToken: () => captured?.callback("token-1"),
  }
}

async function submitForm(body: HTMLElement) {
  const form = body.querySelector("form")!
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
  })
  await vi.waitFor(() => {
    expect(body.querySelector('button[type="submit"]')?.hasAttribute("disabled")).toBe(false)
  })
}

const roots: { root: Root; host: HTMLElement }[] = []

function renderModal(ui: React.ReactNode) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const root = createRoot(host)
  flushSync(() => {
    root.render(<AuthProvider>{ui}</AuthProvider>)
  })
  roots.push({ root, host })
  return document.body
}

afterEach(() => {
  for (const { root, host } of roots.splice(0)) {
    flushSync(() => {
      root.unmount()
    })
    host.remove()
  }
})

describe("AuthModal", () => {
  it("opens on a scrim with log in title and a magic-link alternate", () => {
    const body = renderModal(<AuthModal isOpen={true} isGate={false} onClose={() => {}} />)
    expect(body.querySelector(".auth-scrim")).not.toBeNull()
    expect(body.querySelector('img[alt=""]')).not.toBeNull()
    expect(body.querySelector("#auth-dialog-title")?.textContent).toBe("Log in")
    expect(body.textContent).toMatch(/Email me a magic link instead/i)
    expect(body.textContent).toMatch(/New here\?/i)
  })

  it("switches to signup mode and renders minecraft username input with length limits", () => {
    const body = renderModal(
      <AuthModal isOpen={true} initialMode="signup" isGate={false} onClose={() => {}} />,
    )

    expect(body.querySelector("#auth-dialog-title")?.textContent).toBe("Sign up")
    const mcInput = body.querySelector('input[name="minecraftUsername"]') as HTMLInputElement
    const usernameInput = body.querySelector('input[name="username"]') as HTMLInputElement
    const emailInput = body.querySelector('input[name="email"]') as HTMLInputElement

    expect(mcInput).not.toBeNull()
    expect(mcInput.maxLength).toBe(16)
    expect(usernameInput).not.toBeNull()
    expect(usernameInput.maxLength).toBe(30)
    expect(emailInput).not.toBeNull()
    expect(emailInput.maxLength).toBe(100)
  })

  it("opens magic link mode without password field", () => {
    const body = renderModal(
      <AuthModal isOpen={true} initialMode="magic_link" isGate={false} onClose={() => {}} />,
    )
    expect(body.querySelector("#auth-dialog-title")?.textContent).toBe("Magic link")
    expect(body.querySelector('input[name="password"]')).toBeNull()
    expect(body.textContent).toMatch(/Use a password instead/i)
  })

  it("opens forgot password mode without password field", () => {
    const body = renderModal(
      <AuthModal isOpen={true} initialMode="forgot" isGate={false} onClose={() => {}} />,
    )
    expect(body.querySelector("#auth-dialog-title")?.textContent).toBe("Reset password")
    expect(body.querySelector('input[name="password"]')).toBeNull()
    expect(body.textContent).toMatch(/Back to log in/i)
  })

  it("switches from login to forgot mode via the forgot link", () => {
    const body = renderModal(<AuthModal isOpen={true} isGate={false} onClose={() => {}} />)
    const forgotBtn = [...body.querySelectorAll("button")].find((b) =>
      b.textContent?.match(/Forgot password\?/i),
    )
    expect(forgotBtn).not.toBeUndefined()
    flushSync(() => {
      forgotBtn!.click()
    })
    expect(body.querySelector("#auth-dialog-title")?.textContent).toBe("Reset password")
    expect(body.querySelector('input[name="password"]')).toBeNull()
  })

  it("hides close button when rendered in mandatory gate mode", () => {
    const body = renderModal(<AuthModal isOpen={true} isGate={true} />)

    const closeBtn = body.querySelector('button[aria-label="Close"]')
    expect(closeBtn).toBeNull()
  })
})

describe("AuthModal captcha lifecycle", () => {
  let restoreSignUp: { mockRestore: () => void } | null = null

  beforeEach(() => {
    const signUp = vi.spyOn(supabase.auth, "signUp").mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "captcha protection: request disallowed (timeout-or-duplicate)" },
    } as never)
    restoreSignUp = signUp
  })

  afterEach(() => {
    restoreSignUp?.mockRestore()
    restoreSignUp = null
    delete (window as unknown as { turnstile?: unknown }).turnstile
  })

  function mountSignupModal() {
    const body = renderModal(
      <AuthModal isOpen={true} initialMode="signup" isGate={false} onClose={() => {}} />,
    )
    const email = body.querySelector('input[name="email"]') as HTMLInputElement
    const password = body.querySelector('input[name="password"]') as HTMLInputElement
    const username = body.querySelector('input[name="username"]') as HTMLInputElement
    email.value = "user@example.com"
    password.value = "password123"
    username.value = "PixelWeaver"
    return body
  }

  it("resets the captcha after a failed attempt so the spent token is not replayed", async () => {
    const { fake, issueToken } = stubTurnstile()
    const body = mountSignupModal()
    await vi.waitFor(() => {
      expect(fake.render).toHaveBeenCalled()
    })
    await act(async () => {
      issueToken()
    })

    await submitForm(body)
    await vi.waitFor(() => {
      expect(fake.reset).toHaveBeenCalledWith("widget-1")
    })

    // The token was consumed by the failed attempt; submitting again without
    // re-solving must be blocked instead of replaying the spent token.
    await submitForm(body)
    expect(body.textContent).toMatch(/Please complete the captcha/i)
    expect(fake.reset).toHaveBeenCalledTimes(1)
  })
})
