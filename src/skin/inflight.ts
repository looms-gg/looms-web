/**
 * Shared memo + in-flight dedupe for async render jobs: same-key callers share
 * one work promise, a settled memory hit resolves immediately, and the
 * in-flight entry self-cleans when the work settles so failures can retry.
 */
export function runOnceInflight<T>(
  mem: Map<string, T>,
  inflight: Map<string, Promise<T>>,
  key: string,
  makeWork: () => Promise<T>,
): Promise<T> {
  const hit = mem.get(key)
  if (hit) return Promise.resolve(hit)

  const pending = inflight.get(key)
  if (pending) return pending

  const work = makeWork()
  inflight.set(key, work)
  void work
    .finally(() => {
      if (inflight.get(key) === work) inflight.delete(key)
    })
    .catch(() => {})
  return work
}
