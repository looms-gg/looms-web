import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { AuthProvider } from "../../state/auth"
import * as authModule from "../../state/auth"
import * as likesModule from "../../state/likes"
import { LikeButton } from "./LikeButton"

function renderLike(ui: React.ReactNode) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(<AuthProvider>{ui}</AuthProvider>)
  })
  return host
}

describe("LikeButton", () => {
  it("renders unlikeable state for guests with count", () => {
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      user: null,
    } as any)
    vi.spyOn(likesModule, "useLikesOptional").mockReturnValue(null)

    const host = renderLike(<LikeButton type="garment" id="piece-1" count={3} />)

    const button = host.querySelector('button[aria-label^="Like"]') as HTMLButtonElement
    expect(button).not.toBeNull()
    expect(button.getAttribute("aria-pressed")).toBe("false")
    expect(button.textContent).toMatch(/3/)
  })

  it("toggles like when authenticated", () => {
    const toggleLike = vi.fn(async () => ({ error: null }))
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      user: { id: "u1" },
    } as any)
    vi.spyOn(likesModule, "useLikesOptional").mockReturnValue({
      likedKeys: new Set(),
      loading: false,
      loadError: null,
      dismissLoadError: vi.fn(),
      isLiked: () => false,
      toggleLike,
    })

    const host = renderLike(<LikeButton type="look" id="look-1" count={0} />)

    const button = host.querySelector('button[aria-label^="Like"]') as HTMLButtonElement
    expect(button).not.toBeNull()
    flushSync(() => {
      button.click()
    })
    expect(toggleLike).toHaveBeenCalledWith("look", "look-1")
  })

  it("blurs after a successful unlike so hover-only parents can hide", async () => {
    const toggleLike = vi.fn(async () => ({ error: null }))
    vi.spyOn(authModule, "useAuthOptional").mockReturnValue({
      user: { id: "u1" },
    } as any)
    vi.spyOn(likesModule, "useLikesOptional").mockReturnValue({
      likedKeys: new Set(["garment:piece-1"]),
      loading: false,
      loadError: null,
      dismissLoadError: vi.fn(),
      isLiked: () => true,
      toggleLike,
    })

    const host = renderLike(<LikeButton type="garment" id="piece-1" count={5} />)
    const button = host.querySelector('button[aria-label^="Unlike"]') as HTMLButtonElement
    const blur = vi.spyOn(button, "blur")

    flushSync(() => {
      button.focus()
      button.click()
    })

    await vi.waitFor(() => {
      expect(toggleLike).toHaveBeenCalledWith("garment", "piece-1")
      expect(blur).toHaveBeenCalled()
    })
  })
})
