import { describe, it, expect } from "vitest";
import { generatePublicId, clamp } from "./utils";

describe("generatePublicId", () => {
  it("produces an id of the requested length", () => {
    expect(generatePublicId(20)).toHaveLength(20);
    expect(generatePublicId(8)).toHaveLength(8);
  });

  it("uses only url-safe characters", () => {
    expect(generatePublicId(50)).toMatch(/^[a-z0-9]+$/);
  });

  it("is reasonably unique across calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generatePublicId()));
    expect(ids.size).toBe(100);
  });
});

describe("clamp", () => {
  it("clamps below, within, and above the range", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
