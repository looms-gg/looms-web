/**
 * Shared IndexedDB cache for composited skin thumbnails (iso tiles and hero
 * busts). One database, one store; the cached payload is a versioned result
 * object, so bumping a cache key version in the caller invalidates stale
 * entries without touching the store schema.
 */
const DB_NAME = "looms_iso_cache_v1"
const STORE_NAME = "thumbnails"

let dbPromise: Promise<IDBDatabase | null> | null = null

function getDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null)
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        }
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })
  }
  return dbPromise
}

export async function getStoredThumb<T>(key: string): Promise<T | null> {
  const db = await getDb()
  if (!db) return null
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly")
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve((req.result as T) || null)
      req.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
}

export function setStoredThumb<T>(key: string, data: T) {
  void getDb().then((db) => {
    if (!db) return
    try {
      const tx = db.transaction(STORE_NAME, "readwrite")
      const store = tx.objectStore(STORE_NAME)
      store.put(data, key)
    } catch {
      // ignore
    }
  })
}
