import { describe, it, expect } from "vitest";
import { chunkText } from "./chunk";
import { normalizeText, estimateTokens } from "./normalize";

describe("chunkText", () => {
  it("returns [] for empty/whitespace input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n  ")).toEqual([]);
  });

  it("returns a single chunk when text fits", () => {
    expect(chunkText("hello world", { maxChars: 100 })).toEqual(["hello world"]);
  });

  it("splits long text into multiple chunks, each within maxChars", () => {
    const text = Array.from({ length: 500 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(text, { maxChars: 200, overlap: 40 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(200);
  });

  it("produces overlapping consecutive chunks", () => {
    const text = Array.from({ length: 500 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(text, { maxChars: 200, overlap: 60 });
    // the tail of chunk[0] should reappear near the head of chunk[1]
    const tailWord = chunks[0].split(" ").slice(-1)[0];
    expect(chunks[1]).toContain(tailWord);
  });

  it("does not cut words in half", () => {
    const text = Array.from({ length: 300 }, (_, i) => `token${i}`).join(" ");
    const chunks = chunkText(text, { maxChars: 150, overlap: 30 });
    for (const c of chunks) {
      for (const w of c.split(" ")) {
        expect(w).toMatch(/^token\d+$/);
      }
    }
  });

  it("covers all content across chunks", () => {
    const text = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    const chunks = chunkText(text, { maxChars: 100, overlap: 20 });
    const joined = chunks.join(" ");
    expect(joined).toContain("w0");
    expect(joined).toContain("w199");
  });

  it("rejects invalid options", () => {
    expect(() => chunkText("abc", { maxChars: 0 })).toThrow();
    expect(() => chunkText("abc", { maxChars: 100, overlap: 100 })).toThrow();
  });
});

describe("normalizeText", () => {
  it("normalizes newlines and collapses spaces", () => {
    expect(normalizeText("a\r\nb\r\nc")).toBe("a\nb\nc");
    expect(normalizeText("too    many     spaces")).toBe("too many spaces");
  });

  it("collapses 3+ blank lines to a single blank line and trims", () => {
    expect(normalizeText("a\n\n\n\nb")).toBe("a\n\nb");
    expect(normalizeText("   padded   ")).toBe("padded");
  });
});

describe("estimateTokens", () => {
  it("estimates ~4 chars per token with a floor of 1", () => {
    expect(estimateTokens("")).toBe(1);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });
});
