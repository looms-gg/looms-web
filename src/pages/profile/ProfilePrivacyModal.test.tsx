import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ProfilePrivacyModal } from "./ProfilePrivacyModal"

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

describe("ProfilePrivacyModal", () => {
  it("toggles last seen and likes, and closes", () => {
    const onClose = vi.fn()
    const onToggleLastSeen = vi.fn()
    const onToggleLikes = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ProfilePrivacyModal
          open
          showLastSeen
          showLikes={false}
          onClose={onClose}
          onToggleLastSeen={onToggleLastSeen}
          onToggleLikes={onToggleLikes}
        />,
      )
    })

    expect(host.textContent).toMatch(/Privacy/)
    expect(host.textContent).toMatch(/Last seen/)
    expect(host.textContent).toMatch(/Show likes/)

    const lastSeen = host.querySelector(
      'input[aria-label="Show last seen"]',
    ) as HTMLInputElement
    const likes = host.querySelector('input[aria-label="Show likes"]') as HTMLInputElement
    expect(lastSeen.checked).toBe(true)
    expect(likes.checked).toBe(false)

    flushSync(() => {
      lastSeen.click()
      likes.click()
    })
    expect(onToggleLastSeen).toHaveBeenCalledWith(false)
    expect(onToggleLikes).toHaveBeenCalledWith(true)

    flushSync(() => {
      ;(host.querySelector('button[aria-label="Close"]') as HTMLButtonElement).click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("disables toggles while busy", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <ProfilePrivacyModal
          open
          showLastSeen
          showLikes
          busy
          onClose={() => {}}
          onToggleLastSeen={() => {}}
          onToggleLikes={() => {}}
        />,
      )
    })
    expect(
      (host.querySelector('input[aria-label="Show last seen"]') as HTMLInputElement).disabled,
    ).toBe(true)
    expect(
      (host.querySelector('input[aria-label="Show likes"]') as HTMLInputElement).disabled,
    ).toBe(true)
  })
})
