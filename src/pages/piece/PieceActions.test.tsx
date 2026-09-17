import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces } from "../../data/catalog"
import { AuthProvider } from "../../state/auth"
import { WardrobeProvider } from "../../state/wardrobe"
import { LikesProvider } from "../../state/likes"
import { PieceActions } from "./PieceActions"

afterEach(() => {
  document.body.innerHTML = ""
})

function renderActions(props: Partial<React.ComponentProps<typeof PieceActions>> = {}) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <LikesProvider>
          <MemoryRouter>
            <WardrobeProvider>
              <PieceActions
                piece={pieces[0]}
                owned={false}
                wearing={false}
                onLikeCountChange={() => {}}
                onWear={() => {}}
                onAddToWardrobe={() => {}}
                onAddAndWear={() => {}}
                onRemoveFromWardrobe={() => {}}
                {...props}
              />
            </WardrobeProvider>
          </MemoryRouter>
        </LikesProvider>
      </AuthProvider>,
    )
  })
  return host
}

describe("PieceActions", () => {
  it("offers add-to-wardrobe when not owned", () => {
    const host = renderActions({ owned: false })
    expect(host.textContent).toMatch(/Add to wardrobe/)
    expect(host.textContent).toMatch(/Add & wear/)
  })

  it("offers wear controls when owned", () => {
    const onWear = vi.fn()
    const host = renderActions({ owned: true, wearing: false, onWear })
    const wear = Array.from(host.querySelectorAll("button")).find((b) =>
      /Wear in studio/.test(b.textContent ?? ""),
    ) as HTMLButtonElement
    expect(wear).toBeTruthy()
    flushSync(() => {
      wear.click()
    })
    expect(onWear).toHaveBeenCalled()
  })

  it("does not render an open-studio shortcut", () => {
    const host = renderActions({ owned: true })
    expect(host.textContent).not.toMatch(/Open studio/)
  })

  it("renders share after the primary action button", () => {
    const host = renderActions({ owned: true })
    const texts = Array.from(host.querySelectorAll("button")).map(
      (b) => b.textContent ?? "",
    )
    const wearIdx = texts.findIndex((t) => /Wear in studio/.test(t))
    const shareIdx = texts.findIndex((t) => /Share/.test(t))
    expect(wearIdx).toBeGreaterThanOrEqual(0)
    expect(shareIdx).toBeGreaterThan(wearIdx)
  })

  it("removes from wardrobe via two-tap confirm when owned", () => {
    const onRemoveFromWardrobe = vi.fn()
    const host = renderActions({ owned: true, onRemoveFromWardrobe })
    const savedBtn = host.querySelector(
      '[aria-label^="Remove "]',
    ) as HTMLButtonElement
    expect(savedBtn).toBeTruthy()
    expect(savedBtn.textContent).toMatch(/61/)

    // First tap arms confirmation without removing.
    flushSync(() => {
      savedBtn.click()
    })
    expect(onRemoveFromWardrobe).not.toHaveBeenCalled()

    // Second tap confirms.
    const confirmBtn = host.querySelector(
      '[aria-label^="Confirm removing "]',
    ) as HTMLButtonElement
    expect(confirmBtn).toBeTruthy()
    flushSync(() => {
      confirmBtn.click()
    })
    expect(onRemoveFromWardrobe).toHaveBeenCalledOnce()
  })

  it("shows the save count inside the save button and no passive badge", () => {
    const host = renderActions({ owned: true })
    expect(host.textContent).toMatch(/61/)
    expect(host.querySelector('[title$="saved"]')).toBeNull()
    expect(host.querySelector('[title$="saves"]')).toBeNull()
  })

  it("adds to wardrobe from the save button when not owned", () => {
    const onAddToWardrobe = vi.fn()
    const host = renderActions({ owned: false, onAddToWardrobe })
    const saveBtn = host.querySelector(
      '[aria-label="Add Ash Crop to wardrobe"]',
    ) as HTMLButtonElement
    expect(saveBtn).toBeTruthy()
    expect(saveBtn.textContent).toMatch(/61/)
    flushSync(() => {
      saveBtn.click()
    })
    expect(onAddToWardrobe).toHaveBeenCalledOnce()
  })
})
