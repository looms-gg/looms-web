/**
 * Drive `tick` on a doubling backoff (initialMs → maxMs) while the tab is
 * visible, plus an immediate catch-up tick whenever the tab becomes visible.
 * Ticks are serialized, skipped while hidden or cancelled, and the returned
 * cleanup must be invoked on effect teardown.
 */
export function startBackoffPoll(
  tick: (isCancelled: () => boolean) => Promise<void>,
  { initialMs, maxMs }: { initialMs: number; maxMs: number },
): () => void {
  let cancelled = false
  let running = false
  let delayMs = initialMs
  let timer: number | null = null

  const isCancelled = () => cancelled

  async function run() {
    if (cancelled || running || document.visibilityState === "hidden") return
    running = true
    try {
      await tick(isCancelled)
    } catch {
      // Transient failure — the next scheduled attempt retries.
    } finally {
      running = false
    }
  }

  function scheduleNext() {
    if (cancelled) return
    timer = window.setTimeout(() => {
      void run().finally(scheduleNext)
    }, delayMs)
    delayMs = Math.min(delayMs * 2, maxMs)
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void run()
  }
  document.addEventListener("visibilitychange", onVisible)
  scheduleNext()

  return () => {
    cancelled = true
    if (timer) window.clearTimeout(timer)
    document.removeEventListener("visibilitychange", onVisible)
  }
}
