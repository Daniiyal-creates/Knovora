import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimits } from "./ratelimit";

describe("checkRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("allows up to the limit then blocks", () => {
    const key = "k1";
    expect(checkRateLimit(key, 3, 1000, 0).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 1000, 10).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 1000, 20).allowed).toBe(true);
    const blocked = checkRateLimit(key, 3, 1000, 30);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets after the window elapses", () => {
    const key = "k2";
    checkRateLimit(key, 1, 1000, 0);
    expect(checkRateLimit(key, 1, 1000, 500).allowed).toBe(false);
    expect(checkRateLimit(key, 1, 1000, 1001).allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    expect(checkRateLimit("a", 1, 1000, 0).allowed).toBe(true);
    expect(checkRateLimit("b", 1, 1000, 0).allowed).toBe(true);
    expect(checkRateLimit("a", 1, 1000, 1).allowed).toBe(false);
  });
});
