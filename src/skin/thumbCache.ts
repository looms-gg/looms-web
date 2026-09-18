/**
 * Shared IndexedDB cache for composited skin thumbnails (iso tiles and hero
 * busts). One database, one store; payloads are wrapped with an `at`
 * timestamp for LRU eviction, and the cached result object is versioned by
 * the caller's cache key. An index on `at` lets eviction read only the
 * oldest records instead of materializing the whole store.
 */
const DB_NAME = "looms_iso_cache_v1"
const STORE_NAME = "thumbnails"
// Device storage stays bounded: ~400 PNGs of ~40KB is ~16MB worst case.
export const MAX_THUMB_ENTRIES = 400

let dbPromise: Promise<IDBDatabase | null> | null = null

function getDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 2)
        req.onupgradeneeded = () => {
          const db = req.result
          let store: IDBObjectStore
          const upgradeTx = req.transaction
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            store = db.createObjectStore(STORE_NAME)
          } else if (upgradeTx) {
            store = upgradeTx.objectStore(STORE_NAME)
          } else {
            return
          }
          if (!store.indexNames.contains("at")) {
            store.createIndex("at", "at")
          }
          // One-time legacy sweep: pre-wrapper records lack `at`, so the
          // index skips them while getAllKeys() counts them, permanently
          // inflating `excess` and evicting live entries on every write.
          // They are dead weight anyway (callers version-bumped their keys).
          const sweep = store.openCursor()
          sweep.onsuccess = () => {
            const cursor = sweep.result
            if (!cursor) return
            if (!isWrapped<unknown>(cursor.value)) cursor.delete()
            cursor.continue()
          }
          sweep.onerror = () => {}
        }
        req.onsuccess = () => {
          resolve(req.result)
          // Best-effort boot prune; pruneStoredThumbs reuses this cached
          // dbPromise, so this cannot recurse into another open().
          void pruneStoredThumbs()
        }
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

type Wrapped<T> = { data: T; at: number }
const isWrapped = <T>(value: unknown): value is Wrapped<T> =>
  typeof value === "object" && value !== null && "data" in value && "at" in value

function asyncReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error("idb request failed"))
  })
}

export async function getStoredThumb<T>(key: string): Promise<T | null> {
  const db = await getDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const req = tx.objectStore(STORE_NAME).get(key)
      req.onsuccess = () => {
        const rec = req.result as Wrapped<T> | null
        if (!rec || !isWrapped<T>(rec)) {
          // Pre-wrapper legacy entries: keys are version-bumped anyway.
          resolve(null)
          return
        }
        if (Date.now() - rec.at > 86_400_000) touch(key)
        resolve(rec.data)
      }
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

function touch(key: string) {
  void (async () => {
    const db = await getDb()
    if (!db) return
    try {
      const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME)
      const rec = (await asyncReq(store.get(key))) as Wrapped<unknown> | null
      if (rec && isWrapped(rec)) store.put({ ...rec, at: Date.now() }, key)
    } catch {
      // ignore
    }
  })()
}

// Prunes are serialized: two concurrent prunes each delete their own
// snapshot's `excess`, double-evicting entries the other already removed.
let pruneChain: Promise<void> = Promise.resolve()

function queuePrune(store: IDBObjectStore) {
  pruneChain = pruneChain.then(() => pruneThumbs(store))
}

export function setStoredThumb<T>(key: string, data: T) {
  void getDb().then((db) => {
    if (!db) return
    try {
      const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME)
      store.put({ data, at: Date.now() }, key)
      queuePrune(store)
    } catch {
      // ignore
    }
  })
}

async function pruneThumbs(store: IDBObjectStore) {
  try {
    const keys = await asyncReq<IDBValidKey[]>(store.getAllKeys())
    const excess = keys.length - MAX_THUMB_ENTRIES
    if (excess <= 0) return
    if (store.indexNames.contains("at")) {
      // Cursor over the `at` index in ascending order: touch only the
      // `excess` oldest records instead of deserializing the whole store.
      const req = store.index("at").openCursor(null, "next")
      let remaining = excess
      await new Promise<void>((resolve, reject) => {
        req.onsuccess = () => {
          const cursor = req.result
          if (!cursor || remaining <= 0) {
            resolve()
            return
          }
          cursor.delete()
          remaining--
          cursor.continue()
        }
        req.onerror = () => reject(req.error ?? new Error("idb cursor failed"))
      })
      return
    }
    // Defensive fallback for stores that predate the `at` index:
    // getAll()/getAllKeys() return records in the same key order.
    const recs = await asyncReq<Wrapped<unknown>[]>(store.getAll())
    const order = recs
      .map((rec, i) => ({ key: keys[i] as string, at: rec?.at ?? 0 }))
      .sort((a, b) => a.at - b.at)
    for (const { key } of order.slice(0, excess)) store.delete(key)
  } catch {
    // ignore
  }
}

/** Opportunistic boot prune: called once after the database opens. */
export function pruneStoredThumbs() {
  void getDb().then((db) => {
    if (!db) return
    try {
      queuePrune(db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME))
    } catch {
      // ignore
    }
  })
}
