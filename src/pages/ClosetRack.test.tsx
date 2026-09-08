import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"
import { pieces } from "../data/catalog"
import { AuthProvider } from "../state/auth"
import { SessionProvider } from "../state/closet"
import { LikesProvider } from "../state/likes"
import { ClosetRack } from "./ClosetRack"

afterEach(() => {
  document.body.innerHTML = ""
})

describe("ClosetRack", () => {
  it("shows loading, error, empty, and grid states", () => {
    const loading = document.createElement("div")
    flushSync(() => {
      createRoot(loading).render(
        <ClosetRack
          loading
          error={null}
          pieces={[]}
          filtered={[]}
          layer="all"
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
        <ClosetRack
          loading={false}
          error="offline"
          pieces={[]}
          filtered={[]}
          layer="all"
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
            <MemoryRouter>
              <SessionProvider>
                <ClosetRack
                  loading={false}
                  error={null}
                  pieces={pieces.slice(0, 1)}
                  filtered={[]}
                  layer="all"
                  sort="Newest"
                  query="zzz"
                  onReset={onReset}
                />
              </SessionProvider>
            </MemoryRouter>
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
            <MemoryRouter>
              <SessionProvider>
                <ClosetRack
                  loading={false}
                  error={null}
                  pieces={pieces}
                  filtered={pieces.slice(0, 2)}
                  layer="all"
                  sort="Newest"
                  query=""
                  onReset={() => {}}
                />
              </SessionProvider>
            </MemoryRouter>
          </LikesProvider>
        </AuthProvider>,
      )
    })
    expect(grid.textContent).toContain(pieces[0].name)
  })
})
