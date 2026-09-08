import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces } from "../../data/catalog"
import { AuthProvider } from "../../state/auth"
import { CatalogProvider } from "../../state/catalog"
import { ClosetProvider } from "../../state/closet"
import { LikesProvider } from "../../state/likes"
import { ExploreRack } from "./ExploreRack"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("ExploreRack", () => {
  it("shows loading, error, empty, and grid states", () => {
    const loading = document.createElement("div")
    flushSync(() => {
      createRoot(loading).render(
        <ExploreRack
          loading
          error={null}
          pieces={[]}
          filtered={[]}
          slot="all"
          sort="Newest"
          query=""
          onReset={() => {}}
        />,
      )
    })
    expect(loading.textContent).toMatch(/Opening the racks/)

    const errored = document.createElement("div")
    flushSync(() => {
      createRoot(errored).render(
        <ExploreRack
          loading={false}
          error="offline"
          pieces={[]}
          filtered={[]}
          slot="all"
          sort="Newest"
          query=""
          onReset={() => {}}
        />,
      )
    })
    expect(errored.textContent).toContain("offline")

    const onReset = vi.fn()
    const empty = document.createElement("div")
    flushSync(() => {
      createRoot(empty).render(
        <AuthProvider>
          <LikesProvider>
            <CatalogProvider>
              <MemoryRouter>
                <ClosetProvider>
                  <ExploreRack
                    loading={false}
                    error={null}
                    pieces={pieces.slice(0, 1)}
                    filtered={[]}
                    slot="all"
                    sort="Newest"
                    query="zzz"
                    onReset={onReset}
                  />
                </ClosetProvider>
              </MemoryRouter>
            </CatalogProvider>
          </LikesProvider>
        </AuthProvider>,
      )
    })
    expect(empty.textContent).toMatch(/Nothing in this rack/)
    flushSync(() => {
      ;(empty.querySelector("button") as HTMLButtonElement).click()
    })
    expect(onReset).toHaveBeenCalled()

    const grid = document.createElement("div")
    flushSync(() => {
      createRoot(grid).render(
        <AuthProvider>
          <LikesProvider>
            <CatalogProvider>
              <MemoryRouter>
                <ClosetProvider>
                  <ExploreRack
                    loading={false}
                    error={null}
                    pieces={pieces}
                    filtered={pieces.slice(0, 2)}
                    slot="all"
                    sort="Newest"
                    query=""
                    onReset={() => {}}
                  />
                </ClosetProvider>
              </MemoryRouter>
            </CatalogProvider>
          </LikesProvider>
        </AuthProvider>,
      )
    })
    expect(grid.textContent).toContain(pieces[0].name)
  })
})
