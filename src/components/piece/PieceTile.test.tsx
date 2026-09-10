import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { pieces } from "../../data/catalog"
import { AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { WardrobeProvider, useWardrobe } from "../../state/wardrobe"
import { LikesProvider } from "../../state/likes"
import { PieceTile } from "./PieceTile"

function renderTile(ui: React.ReactNode) {
  const host = document.createElement("div")
  flushSync(() => {
    createRoot(host).render(
      <AuthProvider>
        <CatalogProvider>
          <LikesProvider>
            <MemoryRouter>
              <WardrobeProvider>{ui}</WardrobeProvider>
            </MemoryRouter>
          </LikesProvider>
        </CatalogProvider>
      </AuthProvider>,
    )
  })
  return host
}

describe("PieceTile", () => {
  it("links to the piece page and maker profile", () => {
    const host = renderTile(<PieceTile piece={pieces[0]} />)
    expect(host.querySelector(`a[href="/piece/${pieces[0].id}"]`)).not.toBeNull()
    expect(host.querySelector(`a[href="/u/${pieces[0].maker}"]`)).not.toBeNull()
  })

  it("does not render a like button on tiles", () => {
    const host = renderTile(<PieceTile piece={pieces[0]} />)
    expect(host.querySelector('button[aria-label^="Like"]')).toBeNull()
    expect(host.querySelector('button[aria-label^="Unlike"]')).toBeNull()
  })

  it("opens auth when signed-out user clicks add to wardrobe", () => {
    let owned = false
    function Probe() {
      owned = useWardrobe().owns(pieces[0].id)
      return <PieceTile piece={pieces[0]} />
    }

    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <AuthProvider>
          <CatalogProvider>
            <LikesProvider>
              <MemoryRouter>
                <WardrobeProvider>
                  <Probe />
                </WardrobeProvider>
              </MemoryRouter>
            </LikesProvider>
          </CatalogProvider>
        </AuthProvider>,
      )
    })

    const button = host.querySelector("button[aria-label^='Add']") as HTMLButtonElement
    expect(button).not.toBeNull()
    flushSync(() => {
      button.click()
    })
    expect(owned).toBe(false)
    expect(document.body.textContent).toMatch(/sign in|log in|password/i)
  })

  it("hides action buttons when action is wear", () => {
    const host = renderTile(<PieceTile piece={pieces[0]} action="wear" />)
    expect(host.querySelector("button[title='Add to character']")).toBeNull()
    expect(host.querySelector("button[title='Add to wardrobe']")).toBeNull()
  })
})
