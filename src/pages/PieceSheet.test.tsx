import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces } from "../data/catalog"
import { AuthProvider } from "../state/auth"
import { SessionProvider } from "../state/closet"
import { LikesProvider } from "../state/likes"
import { PieceSheet } from "./PieceSheet"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("PieceSheet", () => {
  it("renders piece identity and edit control for creators", () => {
    const onEdit = vi.fn()
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <LikesProvider>
            <MemoryRouter>
              <SessionProvider>
                <PieceSheet
                  piece={pieces[0]}
                  owned
                  wearing={false}
                  isCreator
                  onEdit={onEdit}
                  onLikeCountChange={() => {}}
                  onWear={() => {}}
                  onAddToWardrobe={() => {}}
                  onAddAndWear={() => {}}
                />
              </SessionProvider>
            </MemoryRouter>
          </LikesProvider>
        </AuthProvider>,
      )
    })
    expect(host.textContent).toContain(pieces[0].name)
    const edit = host.querySelector(
      `button[aria-label="Edit ${pieces[0].name}"]`,
    ) as HTMLButtonElement
    expect(edit).not.toBeNull()
    flushSync(() => {
      edit.click()
    })
    expect(onEdit).toHaveBeenCalled()
  })
})
