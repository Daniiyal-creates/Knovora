import { describe, it, expect } from "vitest";
import {
  chatbotConfigSchema,
  composeSystemInstructions,
  DEFAULT_TONE,
  appearanceSchema,
  parseStarterPrompts,
  MAX_STARTER_PROMPTS,
  parseAllowedDomains,
  hostOf,
} from "./schema";

describe("chatbotConfigSchema", () => {
  it("rejects an empty name", () => {
    const result = chatbotConfigSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid config and defaults language to en", () => {
    const result = chatbotConfigSchema.safeParse({ name: "Support Bot" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.language).toBe("en");
  });

  it("rejects an overly long name", () => {
    const result = chatbotConfigSchema.safeParse({ name: "a".repeat(81) });
    expect(result.success).toBe(false);
  });
});

describe("composeSystemInstructions", () => {
  it("includes the bot name", () => {
    const out = composeSystemInstructions({ name: "Acme Helper" });
    expect(out).toContain("Acme Helper");
  });

  it("always includes the grounding fallback rule", () => {
    const out = composeSystemInstructions({ name: "Bot" });
    expect(out.toLowerCase()).toContain("only the provided knowledge sources");
    expect(out.toLowerCase()).toContain("do not guess");
  });

  it("always includes the untrusted-source guardrail", () => {
    const out = composeSystemInstructions({ name: "Bot" });
    expect(out.toLowerCase()).toContain("untrusted data");
  });

  it("uses the default tone when none is given", () => {
    const out = composeSystemInstructions({ name: "Bot" });
    expect(out).toContain(DEFAULT_TONE);
  });

  it("includes purpose, custom instructions, and a provided tone when present", () => {
    const out = composeSystemInstructions({
      name: "Bot",
      purpose: "answer billing questions",
      tone: "concise",
      custom: "Escalate refunds to a human.",
    });
    expect(out).toContain("answer billing questions");
    expect(out).toContain("concise");
    expect(out).toContain("Escalate refunds to a human.");
  });
});

describe("appearanceSchema", () => {
  it("accepts a valid appearance", () => {
    const r = appearanceSchema.safeParse({
      themeColor: "#aabbcc",
      welcomeMessage: "Hello",
      starterPrompts: ["What are your hours?"],
      widgetPosition: "bottom-left",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a bad hex color", () => {
    expect(appearanceSchema.safeParse({ themeColor: "blue" }).success).toBe(false);
  });

  it("rejects more than the max starter prompts", () => {
    const many = Array.from({ length: MAX_STARTER_PROMPTS + 1 }, (_, i) => `q${i}`);
    expect(appearanceSchema.safeParse({ starterPrompts: many }).success).toBe(false);
  });
});

describe("parseStarterPrompts", () => {
  it("splits, trims, drops blanks, and caps the count", () => {
    const raw = "  one  \n\ntwo\n three \n" + Array.from({ length: 10 }, (_, i) => `x${i}`).join("\n");
    const out = parseStarterPrompts(raw);
    expect(out[0]).toBe("one");
    expect(out).not.toContain("");
    expect(out.length).toBeLessThanOrEqual(MAX_STARTER_PROMPTS);
  });
});

describe("parseAllowedDomains", () => {
  it("strips protocol/path/port and lowercases", () => {
    const out = parseAllowedDomains("https://Example.com/foo\nwww.test.org:3000\n  acme.io  ");
    expect(out).toEqual(["example.com", "www.test.org", "acme.io"]);
  });
  it("drops invalid entries", () => {
    expect(parseAllowedDomains("not a domain\n#@!\n")).toEqual([]);
  });
  it("accepts comma separation and localhost", () => {
    expect(parseAllowedDomains("a.com, localhost")).toEqual(["a.com", "localhost"]);
  });
});

describe("hostOf", () => {
  it("returns the hostname or null", () => {
    expect(hostOf("https://example.com/page")).toBe("example.com");
    expect(hostOf("garbage")).toBeNull();
  });
});
