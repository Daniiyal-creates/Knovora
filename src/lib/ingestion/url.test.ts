import { describe, it, expect } from "vitest";
import { htmlToText } from "./url";
import { validateUrl, isBlockedHost } from "@/lib/knowledge/constants";

describe("htmlToText", () => {
  it("extracts visible text and drops scripts/styles", () => {
    const html = `
      <html><head><title>My Page</title><style>.x{color:red}</style></head>
      <body>
        <nav>menu home about</nav>
        <article><h1>Hello</h1><p>This is the main content.</p></article>
        <script>console.log("ignore me")</script>
        <footer>copyright</footer>
      </body></html>`;
    const { text, title } = htmlToText(html);
    expect(title).toBe("My Page");
    expect(text).toContain("Hello");
    expect(text).toContain("This is the main content.");
    expect(text).not.toContain("ignore me");
    expect(text).not.toContain("copyright");
    expect(text).not.toContain("menu home about");
  });

  it("falls back to body when no article/main", () => {
    const { text } = htmlToText("<body><div><p>Just body text.</p></div></body>");
    expect(text).toContain("Just body text.");
  });
});

describe("validateUrl", () => {
  it("accepts http/https", () => {
    expect(validateUrl("https://example.com/page").ok).toBe(true);
    expect(validateUrl("http://example.com").ok).toBe(true);
  });
  it("rejects non-http protocols and junk", () => {
    expect(validateUrl("ftp://example.com").ok).toBe(false);
    expect(validateUrl("not a url").ok).toBe(false);
    expect(validateUrl("").ok).toBe(false);
  });
});

describe("isBlockedHost", () => {
  it("blocks loopback / private / link-local hosts", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("10.1.2.3")).toBe(true);
    expect(isBlockedHost("192.168.0.5")).toBe(true);
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("169.254.169.254")).toBe(true);
  });
  it("allows public hosts", () => {
    expect(isBlockedHost("example.com")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
  });
});
