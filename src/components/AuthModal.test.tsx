import { createRoot, type Root } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it } from "vitest"
import { AuthProvider } from "../state/auth"
import { AuthModal } from "./AuthModal"

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

  it("hides close button when rendered in mandatory gate mode", () => {
    const body = renderModal(<AuthModal isOpen={true} isGate={true} />)

    const closeBtn = body.querySelector('button[aria-label="Close"]')
    expect(closeBtn).toBeNull()
  })
})
