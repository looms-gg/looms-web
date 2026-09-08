import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi, afterEach } from "vitest"
import { LookTile } from "./LookTile"
import type { PublicLook } from "../../state/publicLooks"
import { AuthProvider } from "../../state/auth"
import { LikesProvider } from "../../state/likes"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("LookTile", () => {
  const sampleLook: PublicLook = {
    id: "look-abc",
    userId: "user-1",
    name: "Frostbite Explorer",
    description: "Cold weather adventure kit",
    visibility: "public",
    stack: ["ink-fall", "winter-coat"],
    bodyId: "slate",
    bodyHue: 0,
    model: "classic",
    likeCount: 42,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    maker: "ChillyBuilder",
    makerAvatarUrl: null,
  }

  it("renders look name, maker, layer count, and link to look page", async () => {
    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <LikesProvider>
              <MemoryRouter>
                <LookTile look={sampleLook} />
              </MemoryRouter>
            </LikesProvider>
          </AuthProvider>,
        )
      })
    })

    expect(host.textContent).toContain("Frostbite Explorer")
    expect(host.textContent).toContain("ChillyBuilder")
    expect(host.textContent).toMatch(/2 layers/i)
    expect(host.textContent).toContain("42")

    const anchor = host.querySelector("a[href='/look/look-abc']")
    expect(anchor).not.toBeNull()
  })
})
