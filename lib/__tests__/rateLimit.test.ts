import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Use a fresh import each test by resetting module state via vi.resetModules
// We directly test the exported function after controlling time via vi.useFakeTimers

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", async () => {
    // Isolate module per test to get fresh store
    vi.resetModules();
    const { checkRateLimit } = await import("../rateLimit");

    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit("test-key", 5, 60_000);
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", async () => {
    vi.resetModules();
    const { checkRateLimit } = await import("../rateLimit");

    for (let i = 0; i < 5; i++) checkRateLimit("k", 5, 60_000);
    const r = checkRateLimit("k", 5, 60_000);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window expires", async () => {
    vi.resetModules();
    const { checkRateLimit } = await import("../rateLimit");

    for (let i = 0; i < 5; i++) checkRateLimit("k2", 5, 60_000);
    expect(checkRateLimit("k2", 5, 60_000).allowed).toBe(false);

    // Advance time past the window
    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit("k2", 5, 60_000).allowed).toBe(true);
  });

  it("different keys are tracked independently", async () => {
    vi.resetModules();
    const { checkRateLimit } = await import("../rateLimit");

    for (let i = 0; i < 3; i++) checkRateLimit("a", 3, 60_000);
    expect(checkRateLimit("a", 3, 60_000).allowed).toBe(false);
    expect(checkRateLimit("b", 3, 60_000).allowed).toBe(true);
  });

  it("reports correct remaining count", async () => {
    vi.resetModules();
    const { checkRateLimit } = await import("../rateLimit");

    const r1 = checkRateLimit("r", 5, 60_000);
    expect(r1.remaining).toBe(4);

    const r2 = checkRateLimit("r", 5, 60_000);
    expect(r2.remaining).toBe(3);
  });
});
