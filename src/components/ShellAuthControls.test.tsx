import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ShellAuthControls } from "./ShellAuthControls"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("ShellAuthControls", () => {
  it("shows auth buttons when signed out", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <ShellAuthControls
            user={null}
            displayName="Player"
            emailVerified={false}
            onOpenEmailVerify={() => {}}
            onSignOut={() => {}}
          />
        </MemoryRouter>,
      )
    })
    expect(host.textContent).toMatch(/Sign in|Log in|Sign up/i)
  })

  it("shows confirm email and profile menu when signed in unverified", () => {
    const onOpen = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <MemoryRouter>
          <ShellAuthControls
            user={{ id: "u1" }}
            displayName="PixelWeaver"
            username="PixelWeaver"
            emailVerified={false}
            onOpenEmailVerify={onOpen}
            onSignOut={() => {}}
          />
        </MemoryRouter>,
      )
    })
    const confirm = Array.from(host.querySelectorAll("button")).find((b) =>
      /Confirm email/.test(b.textContent ?? ""),
    ) as HTMLButtonElement
    expect(confirm).toBeTruthy()
    flushSync(() => {
      confirm.click()
    })
    expect(onOpen).toHaveBeenCalled()
    expect(host.textContent).toContain("PixelWeaver")
  })
})
