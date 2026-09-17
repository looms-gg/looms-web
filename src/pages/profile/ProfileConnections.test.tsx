import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { mockSupabaseFrom } from "../../test/supabaseMock"
import { ProfileConnections } from "./ProfileConnections"

function mount(userId: string) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  flushSync(() => {
    createRoot(host).render(<ProfileConnections userId={userId} />)
  })
  return host
}

describe("ProfileConnections", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ""
  })

  it("renders a Discord badge when a featured row exists", async () => {
    mockSupabaseFrom().on("profile_connections", {
      data: [{ provider: "discord" }],
      error: null,
    })
    const host = mount("u1")
    await act(async () => {
      await Promise.resolve()
    })
    flushSync(() => {})
    expect(host.querySelector('[aria-label="On Discord"]')).toBeTruthy()
  })

  it("renders nothing when there are no featured rows", async () => {
    mockSupabaseFrom().on("profile_connections", { data: [], error: null })
    const host = mount("u1")
    await act(async () => {
      await Promise.resolve()
    })
    flushSync(() => {})
    expect(host.textContent).toBe("")
  })
})
