import { describe, expect, it, vi } from "vitest";
import { throttle } from "./throttle";

// flush coverage lives with the store persistence test

describe("throttle", () => {
  it("runs immediately, then at most once per window", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("passes through the latest args", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const throttled = throttle(fn, 50);
    throttled(1);
    throttled(2);
    vi.advanceTimersByTime(50);
    expect(fn).toHaveBeenLastCalledWith(2);
    vi.useRealTimers();
  });
});
