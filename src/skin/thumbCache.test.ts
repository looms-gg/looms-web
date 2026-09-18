import { beforeEach, describe, expect, it, vi } from "vitest"

type Rec = { data: unknown; at: number }

function installFakeIndexedDB() {
  const map = new Map<string, Rec>()
  const store = {
    get: (key: string) => {
      const req = {
        result: map.get(key) ?? null,
        onsuccess: null as (() => void) | null,
        onerror: null,
      }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    put: (value: Rec, key: string) => {
      map.set(key, value)
      return {}
    },
    delete: (key: string) => {
      map.delete(key)
      return {}
    },
    getAllKeys: () => {
      const req = { result: [...map.keys()], onsuccess: null as (() => void) | null, onerror: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    getAll: () => {
      const req = { result: [...map.values()], onsuccess: null as (() => void) | null, onerror: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    indexNames: { contains: (name: string) => name === "at" },
    createIndex: () => {},
    openCursor: () => {
      const entries = [...map.entries()]
      let i = 0
      type Cursor = { value: unknown; delete: () => unknown; continue: () => void }
      const req = {
        result: null as Cursor | null,
        onsuccess: null as (() => void) | null,
        onerror: null,
      }
      const step = () => {
        if (i < entries.length) {
          const [key, rec] = entries[i]
          req.result = {
            value: rec,
            delete: () => map.delete(key),
            continue: () => {
              i++
              step()
            },
          }
        } else {
          req.result = null
        }
        queueMicrotask(() => req.onsuccess?.())
      }
      step()
      return req
    },
    index: () => ({
      openCursor: () => {
        const entries = [...map.entries()]
          .map(([key, rec]) => ({ key, rec }))
          .sort((a, b) => (a.rec?.at ?? 0) - (b.rec?.at ?? 0))
        let i = 0
        type Cursor = { key: string; value: Rec; delete: () => unknown; continue: () => void }
        const req = {
          result: null as Cursor | null,
          onsuccess: null as (() => void) | null,
          onerror: null,
        }
        const step = () => {
          if (i < entries.length) {
            const { key, rec } = entries[i]
            req.result = {
              key,
              value: rec,
              delete: () => map.delete(key),
              continue: () => {
                i++
                step()
              },
            }
          } else {
            req.result = null
          }
          queueMicrotask(() => req.onsuccess?.())
        }
        step()
        return req
      },
    }),
  }
  const db = {
    objectStoreNames: { contains: () => true },
    transaction: (_name: string, _mode?: string) => ({ objectStore: () => store }),
  }
  ;(globalThis as { indexedDB?: unknown }).indexedDB = {
    open: () => {
      const req = {
        result: db,
        transaction: { objectStore: () => store },
        onsuccess: null as (() => void) | null,
        onerror: null,
        onupgradeneeded: null as (() => void) | null,
      }
      queueMicrotask(() => req.onupgradeneeded?.())
      // Real IndexedDB fires onsuccess only after the versionchange
      // transaction (the upgrade sweep cursor) fully commits; a macrotask
      // lets the sweep's microtask chain drain first.
      setTimeout(() => req.onsuccess?.(), 0)
      return req
    },
  }
  return map
}

describe("thumbCache", () => {
  beforeEach(() => {
    vi.resetModules()
    installFakeIndexedDB()
  })

  it("round-trips payloads through the transparent wrapper", async () => {
    const { setStoredThumb, getStoredThumb } = await import("./thumbCache")
    setStoredThumb("k", { a: 1 })
    await vi.waitFor(() => expect(getStoredThumb<{ a: number }>("k")).resolves.toEqual({ a: 1 }))
  })

  it("evicts oldest entries beyond the LRU cap", async () => {
    const { setStoredThumb, getStoredThumb, MAX_THUMB_ENTRIES } = await import("./thumbCache")
    for (let i = 0; i < MAX_THUMB_ENTRIES + 20; i++) {
      setStoredThumb(`k${i}`, i)
    }
    await vi.waitFor(async () => {
      const oldest = await getStoredThumb<number>("k0")
      const newest = await getStoredThumb<number>(`k${MAX_THUMB_ENTRIES + 19}`)
      expect(oldest).toBeNull()
      expect(newest).toBe(MAX_THUMB_ENTRIES + 19)
    })
  })

  it("treats unwrapped legacy entries as misses", async () => {
    const { getStoredThumb } = await import("./thumbCache")
    const map = installFakeIndexedDB()
    map.set("legacy", { png: "raw-legacy-png" } as unknown as Rec)
    expect(await getStoredThumb("legacy")).toBeNull()
  })

  it("sweeps legacy records on upgrade so eviction counts stay honest", async () => {
    const map = installFakeIndexedDB()
    for (let i = 0; i < 5; i++) {
      map.set(`legacy${i}`, { png: `raw-${i}` } as unknown as Rec)
    }
    for (let i = 0; i < 400; i++) {
      map.set(`w${i}`, { data: i, at: 1000 + i })
    }
    const { setStoredThumb, MAX_THUMB_ENTRIES } = await import("./thumbCache")
    setStoredThumb("new", 42)
    await vi.waitFor(() => {
      expect(map.size).toBe(MAX_THUMB_ENTRIES)
      const wrapped = [...map.values()].filter((v) => "data" in v && "at" in v)
      expect(wrapped.length).toBe(MAX_THUMB_ENTRIES)
      expect(map.get("legacy0")).toBeUndefined()
      expect(map.get("new")).toEqual({ data: 42, at: expect.any(Number) })
    })
  })
})
