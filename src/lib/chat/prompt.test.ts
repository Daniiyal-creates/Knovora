import { describe, it, expect } from "vitest";
import { formatContext, buildSystemInstruction, buildContents } from "./prompt";
import type { RetrievedChunk } from "./types";

function chunk(partial: Partial<RetrievedChunk>): RetrievedChunk {
  return {
    content: "content",
    sourceId: "s1",
    title: "Doc",
    url: null,
    chunkIndex: 0,
    similarity: 0.9,
    ...partial,
  };
}

describe("formatContext", () => {
  it("numbers sources and dedupes multiple chunks from the same source", () => {
    const { text, citations } = formatContext([
      chunk({ sourceId: "s1", title: "A", content: "alpha" }),
      chunk({ sourceId: "s1", title: "A", content: "beta" }),
      chunk({ sourceId: "s2", title: "B", content: "gamma" }),
    ]);
    expect(citations).toHaveLength(2);
    expect(text).toContain("[1]");
    expect(text).toContain("[2]");
    expect(text).toContain("alpha");
    expect(text).toContain("beta");
    expect(text).toContain("gamma");
  });

  it("returns empty text and no citations for no chunks", () => {
    const { text, citations } = formatContext([]);
    expect(text).toBe("");
    expect(citations).toHaveLength(0);
  });
});

describe("buildSystemInstruction", () => {
  it("includes the context and a citation instruction when context exists", () => {
    const out = buildSystemInstruction("BASE RULES", "[1] (Doc)\nsome passage");
    expect(out).toContain("BASE RULES");
    expect(out).toContain("some passage");
    expect(out.toLowerCase()).toContain("cite");
  });

  it("instructs an explicit fallback when there is no context", () => {
    const out = buildSystemInstruction("BASE RULES", "");
    expect(out.toLowerCase()).toContain("don't have that information");
    expect(out.toLowerCase()).toContain("do not make anything up");
  });
});

describe("buildContents", () => {
  it("maps roles and appends the new question last", () => {
    const contents = buildContents(
      [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
      "what are your hours?",
    );
    expect(contents).toHaveLength(3);
    expect(contents[0]).toEqual({ role: "user", parts: [{ text: "hi" }] });
    expect(contents[1]).toEqual({ role: "model", parts: [{ text: "hello" }] });
    expect(contents[2]).toEqual({ role: "user", parts: [{ text: "what are your hours?" }] });
  });

  it("trims history to the last N turns but always keeps the new question", () => {
    const history = Array.from({ length: 20 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `m${i}`,
    }));
    const contents = buildContents(history, "final", 6);
    expect(contents).toHaveLength(7); // 6 history + 1 question
    expect(contents.at(-1)).toEqual({ role: "user", parts: [{ text: "final" }] });
  });
});
