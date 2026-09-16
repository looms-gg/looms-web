// Ported from MineSkin (github.com/hamza512b/mineskin), commit 98023b6ca269a26fe31fa5f3b03db00380a8eae6. AGPL-3.0.
// Replacement for lodash's throttle, which the ported store and orbit control
// relied on. Carries lodash's trailing-edge semantics: a call inside the wait
// window is scheduled once, with the latest args.
export interface ThrottledFunction<A extends unknown[]> {
  (...args: A): void;
  flush(): void;
}

export function throttle<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): ThrottledFunction<A> {
  let lastCall = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: A | null = null;

  const invoke = (args: A) => {
    lastCall = Date.now();
    timer = null;
    pendingArgs = null;
    fn(...args);
  };

  const throttled = (...args: A) => {
    pendingArgs = args;
    const remaining = waitMs - (Date.now() - lastCall);
    if (remaining <= 0 && timer === null) {
      invoke(args);
      return;
    }
    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;
        if (pendingArgs) invoke(pendingArgs);
      }, remaining);
    }
  };

  throttled.flush = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      if (pendingArgs) invoke(pendingArgs);
    }
  };

  return throttled;
}
