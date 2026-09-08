import { act } from "react"
import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as comments from "../../state/comments"
import { AuthProvider } from "../../state/auth"
import * as authModule from "../../state/auth"
import { PieceComments } from "./PieceComments"

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ""
})

describe("PieceComments", () => {
  it("shows sign-in CTA when logged out and lists loaded comments", async () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue(null)
    vi.spyOn(comments, "fetchGarmentComments").mockResolvedValue([
      {
        id: "c1",
        targetType: "garment",
        targetId: "g1",
        garmentId: "g1",
        userId: "u2",
        parentId: null,
        body: "Nice weave",
        createdAt: Date.parse("2026-01-02T00:00:00Z"),
        updatedAt: Date.parse("2026-01-02T00:00:00Z"),
        username: "MakerTwo",
      },
    ])

    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <MemoryRouter>
              <PieceComments garmentId="g1" garmentOwnerId="u1" />
            </MemoryRouter>
          </AuthProvider>,
        )
      })
      await Promise.resolve()
    })

    expect(host.textContent).toMatch(/Sign in to leave a comment/)
    expect(host.textContent).toContain("Nice weave")
    expect(host.textContent).toContain("MakerTwo")
  })

  it("hides comments for private garments from non-owners", async () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      user: { id: "stranger" },
    } as ReturnType<typeof authModule.useAuthOptional>)
    const fetchSpy = vi.spyOn(comments, "fetchGarmentComments")

    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <MemoryRouter>
              <PieceComments garmentId="g1" garmentOwnerId="u1" isPublic={false} />
            </MemoryRouter>
          </AuthProvider>,
        )
      })
    })

    expect(host.textContent).toBe("")
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("renders a composer for signed-in viewers", async () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      user: { id: "u1" },
    } as ReturnType<typeof authModule.useAuthOptional>)
    vi.spyOn(comments, "fetchGarmentComments").mockResolvedValue([])

    const host = document.createElement("div")
    await act(async () => {
      flushSync(() => {
        createRoot(host).render(
          <AuthProvider>
            <MemoryRouter>
              <PieceComments garmentId="g1" garmentOwnerId="u1" />
            </MemoryRouter>
          </AuthProvider>,
        )
      })
      await Promise.resolve()
    })

    expect(host.querySelector("textarea")).not.toBeNull()
    expect(host.textContent).toMatch(/Post/)
    expect(host.textContent).toMatch(/No comments yet/)
  })
})
