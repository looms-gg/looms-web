import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { supabase } from "../../lib/supabase"
import { ProfileConnections } from "./ProfileConnections"

function fromChain(result: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return chain
}

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
    vi.spyOn(supabase, "from").mockReturnValue(
      fromChain({ data: [{ provider: "discord" }], error: null }) as never,
    )
    const host = mount("u1")
    await act(async () => {
      await Promise.resolve()
    })
    flushSync(() => {})
    expect(host.querySelector('[aria-label="On Discord"]')).toBeTruthy()
  })

  it("renders nothing when there are no featured rows", async () => {
    vi.spyOn(supabase, "from").mockReturnValue(
      fromChain({ data: [], error: null }) as never,
    )
    const host = mount("u1")
    await act(async () => {
      await Promise.resolve()
    })
    flushSync(() => {})
    expect(host.textContent).toBe("")
  })
})
