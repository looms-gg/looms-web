import { createRoot } from "react-dom/client"
import { flushSync } from "react-dom"
import { describe, expect, it, vi } from "vitest"
import { pieces } from "../data/catalog"
import { IsoThumb } from "./IsoThumb"

describe("IsoThumb", () => {
  it("exports the still preview", () => {
    expect(typeof IsoThumb).toBe("function")
  })

  it("uses a tighter root margin for chip thumbs", () => {
    let createdMargin = ""
    const originalIO = window.IntersectionObserver
    class MockIntersectionObserver {
      root = null
      rootMargin = ""
      thresholds = []
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = () => []
      constructor(
        _callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        createdMargin = options?.rootMargin ?? ""
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
    try {
      const host = document.createElement("div")
      flushSync(() => {
        createRoot(host).render(
          <IsoThumb piece={pieces[0]} alt={pieces[0].name} chip />
        )
      })
      expect(createdMargin).toBe("80px")
    } finally {
      window.IntersectionObserver = originalIO
    }
  })

  it("renders chip frame when chip is true", () => {
    const host = document.createElement("div")
    flushSync(() => {
      createRoot(host).render(
        <IsoThumb piece={pieces[0]} alt={pieces[0].name} chip />
      )
    })
    const frame = host.querySelector(".iso-frame")
    expect(frame?.classList.contains("iso-frame--chip")).toBe(true)
  })

  it("observes intersection when IntersectionObserver is present", () => {
    let observedElement: Element | null = null
    const mockObserve = vi.fn((el: Element) => {
      observedElement = el
    })
    let createdMargin = ""
    const mockDisconnect = vi.fn()

    const originalIO = window.IntersectionObserver
    class MockIntersectionObserver {
      root = null
      rootMargin = ""
      thresholds = []
      observe = mockObserve
      disconnect = mockDisconnect
      unobserve = vi.fn()
      takeRecords = () => []
      constructor(
        _callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) {
        this.rootMargin = options?.rootMargin ?? ""
        createdMargin = this.rootMargin
      }
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver

    try {
      const host = document.createElement("div")
      flushSync(() => {
        createRoot(host).render(
          <IsoThumb piece={pieces[0]} alt={pieces[0].name} />
        )
      })
      expect(mockObserve).toHaveBeenCalled()
      expect(observedElement).toBe(host.querySelector(".iso-frame"))
      expect(createdMargin).toBe("120px")
    } finally {
      window.IntersectionObserver = originalIO
    }
  })

  it("starts priority thumbs without waiting on intersection", () => {
    const mockObserve = vi.fn()
    const originalIO = window.IntersectionObserver
    class MockIntersectionObserver {
      root = null
      rootMargin = ""
      thresholds = []
      observe = mockObserve
      disconnect = vi.fn()
      unobserve = vi.fn()
      takeRecords = () => []
      constructor(
        _callback: IntersectionObserverCallback,
        _options?: IntersectionObserverInit,
      ) {}
    }
    window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
    try {
      const host = document.createElement("div")
      flushSync(() => {
        createRoot(host).render(
          <IsoThumb piece={pieces[0]} alt={pieces[0].name} priority />
        )
      })
      expect(mockObserve).not.toHaveBeenCalled()
    } finally {
      window.IntersectionObserver = originalIO
    }
  })
})
