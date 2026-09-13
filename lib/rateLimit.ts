/**
 * A small in-memory sliding-window rate limiter.
 *
 * Honest about what this is: serverless instances are ephemeral and several can
 * run at once, so counts are per-instance and reset on a cold start. It is a
 * speed bump against a naive loop against a public demo endpoint, not a
 * guarantee. The alternative — a shared store like Redis — would be the right
 * answer for a real product and is overkill for this one.
 *
 * Pure apart from the clock, which is injectable so the behaviour can be tested
 * without waiting an hour.
 */

export type RateLimitResult = {
  ok: boolean;
  /** Requests left in the current window, after counting this one. */
  remaining: number;
  /** Seconds until the oldest request falls out of the window. 0 when allowed. */
  retryAfterSeconds: number;
};

export type RateLimiter = {
  check: (key: string, now?: number) => RateLimitResult;
  /** Number of keys currently tracked — used by the tests to prove pruning works. */
  readonly size: number;
};

export function createRateLimiter({
  windowMs,
  max,
  maxKeys = 5000,
}: {
  windowMs: number;
  max: number;
  /** Hard ceiling on tracked keys, so a spray of unique IPs cannot grow the map without bound. */
  maxKeys?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, times] of hits) {
      const live = times.filter((t) => now - t < windowMs);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }

  return {
    check(key: string, now: number = Date.now()): RateLimitResult {
      if (hits.size >= maxKeys) prune(now);

      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

      if (recent.length >= max) {
        hits.set(key, recent);
        return {
          ok: false,
          remaining: 0,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((windowMs - (now - recent[0])) / 1000),
          ),
        };
      }

      recent.push(now);
      hits.set(key, recent);
      return {
        ok: true,
        remaining: max - recent.length,
        retryAfterSeconds: 0,
      };
    },

    get size() {
      return hits.size;
    },
  };
}

/** First hop in X-Forwarded-For is the client; everything after it is proxies. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}
