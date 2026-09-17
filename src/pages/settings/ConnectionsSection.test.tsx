import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ConnectionsSection } from "./ConnectionsSection"
import type { AuthContextValue } from "../../state/auth"
import { makeAuthStub } from "../../test/authStub"

const state = vi.hoisted(() => ({ value: null as Record<string, unknown> | null }))

vi.mock("../../state/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../state/auth")>()
  return {
    ...actual,
    useAuth: () => state.value as unknown as AuthContextValue,
  }
})

vi.mock("../../state/connections", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../state/connections")>()
  return {
    ...actual,
    useConnections: () => state.value as unknown as Record<string, unknown>,
  }
})

const baseAuth: Record<string, unknown> = makeAuthStub({
  signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
})

const baseConnections = {
  connections: [{ user_id: "u1", provider: "discord", featured: false, created_at: "x" }],
  unlinkConnection: vi.fn().mockResolvedValue({ error: null }),
  setConnectionFeatured: vi.fn().mockResolvedValue({ error: null }),
}

function mountSection() {
  const host = document.createElement("div")
  document.body.appendChild(host)
  flushSync(() => {
    createRoot(host).render(<ConnectionsSection />)
  })
  return host
}

describe("ConnectionsSection", () => {
  afterEach(() => {
    state.value = null
    document.body.innerHTML = ""
    vi.clearAllMocks()
  })

  it("lists all three providers with linked state", () => {
    state.value = { ...baseAuth, ...baseConnections }
    const host = mountSection()
    expect(host.textContent).toContain("Discord")
    expect(host.textContent).toContain("Google")
    expect(host.textContent).toContain("GitHub")
    expect(host.textContent).not.toContain("Microsoft")
    expect(host.textContent).toContain("Linked")
  })

  it("shows the feature toggle only for linked Discord", () => {
    state.value = { ...baseAuth, ...baseConnections }
    const host = mountSection()
    expect(
      host.querySelector('input[type=checkbox][aria-label="Feature Discord on your profile"]'),
    ).toBeTruthy()
  })

  it("calls unlinkConnection with the provider", async () => {
    state.value = { ...baseAuth, ...baseConnections }
    const host = mountSection()
    const unlinkButton = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Unlink"),
    )!
    await act(async () => {
      unlinkButton.click()
      await Promise.resolve()
    })
    expect(baseConnections.unlinkConnection).toHaveBeenCalledWith("discord")
  })

  it("calls signInWithOAuth for unlinked providers", async () => {
    state.value = { ...baseAuth, ...baseConnections, connections: [] }
    const host = mountSection()
    const connectButton = [...host.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Connect"),
    )!
    await act(async () => {
      connectButton.click()
      await Promise.resolve()
    })
    expect(baseAuth.signInWithOAuth).toHaveBeenCalled()
  })
})
