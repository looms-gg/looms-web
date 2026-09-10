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
    expect(host.textContent).toMatch(/Open studio/)
  })
})
