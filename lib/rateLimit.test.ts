import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rateLimit";

const HOUR = 60 * 60 * 1000;

describe("createRateLimiter", () => {
  it("allows requests up to the limit and blocks the next one", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 3 });
    const t = 1_000_000;
    expect(limiter.check("a", t).ok).toBe(true);
    expect(limiter.check("a", t + 1).ok).toBe(true);
    expect(limiter.check("a", t + 2).ok).toBe(true);
    expect(limiter.check("a", t + 3).ok).toBe(false);
  });

  it("counts down the remaining allowance", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 3 });
    const t = 1_000_000;
    expect(limiter.check("a", t).remaining).toBe(2);
    expect(limiter.check("a", t).remaining).toBe(1);
    expect(limiter.check("a", t).remaining).toBe(0);
  });

  it("says how long to wait, measured from the oldest request in the window", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 1 });
    const t = 1_000_000;
    limiter.check("a", t);
    // Half an hour later the window still holds that first request.
    const blocked = limiter.check("a", t + HOUR / 2);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1800);
  });

  it("never reports a zero wait while blocked", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 1 });
    const t = 1_000_000;
    limiter.check("a", t);
    // A hair before the window closes, rounding must not produce "retry in 0s".
    expect(limiter.check("a", t + HOUR - 1).retryAfterSeconds).toBeGreaterThan(0);
  });

  it("lets the caller through again once the window has passed", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 2 });
    const t = 1_000_000;
    limiter.check("a", t);
    limiter.check("a", t);
    expect(limiter.check("a", t).ok).toBe(false);
    expect(limiter.check("a", t + HOUR + 1).ok).toBe(true);
  });

  it("slides rather than resetting in fixed blocks", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 2 });
    const t = 1_000_000;
    limiter.check("a", t);
    limiter.check("a", t + HOUR / 2);
    // The first request expires here, freeing exactly one slot — not two.
    expect(limiter.check("a", t + HOUR + 1).ok).toBe(true);
    expect(limiter.check("a", t + HOUR + 2).ok).toBe(false);
  });

  it("keeps callers independent of one another", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 1 });
    const t = 1_000_000;
    expect(limiter.check("a", t).ok).toBe(true);
    expect(limiter.check("b", t).ok).toBe(true);
    expect(limiter.check("a", t).ok).toBe(false);
  });

  it("drops expired keys instead of growing without bound", () => {
    const limiter = createRateLimiter({ windowMs: HOUR, max: 5, maxKeys: 3 });
    const t = 1_000_000;
    limiter.check("a", t);
    limiter.check("b", t);
    limiter.check("c", t);
    expect(limiter.size).toBe(3);
    // Every existing key is now stale, so adding another prunes rather than grows.
    limiter.check("d", t + HOUR + 1);
    expect(limiter.size).toBe(1);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("https://example.com", { headers });

  it("takes the client hop from x-forwarded-for", () => {
    expect(clientKey(req({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" }))).toBe(
      "203.0.113.7",
    );
  });

  it("trims whitespace around the address", () => {
    expect(clientKey(req({ "x-forwarded-for": "  203.0.113.7 " }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientKey(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
  });

  it("returns a stable bucket when no address header is present", () => {
    expect(clientKey(req({}))).toBe("unknown");
  });

  it("does not treat an empty forwarded header as an address", () => {
    expect(clientKey(req({ "x-forwarded-for": "", "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
  });
});
