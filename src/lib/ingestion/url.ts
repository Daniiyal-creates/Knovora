import * as cheerio from "cheerio";
import { normalizeText } from "./normalize";
import { validateUrl, isBlockedHost } from "@/lib/knowledge/constants";

const FETCH_TIMEOUT_MS = 15000;
const MAX_PAGE_BYTES = 5 * 1024 * 1024; // 5 MB of HTML

/** Extract readable text (and title) from an HTML string. Pure, no network. */
export function htmlToText(html: string): { text: string; title: string | null } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer, header, form, aside").remove();

  const title = $("title").first().text().trim() || null;

  const article = $("article");
  const main = $("main");
  const root = article.length ? article : main.length ? main : $("body");

  return { text: normalizeText(root.text()), title };
}

/** Fetch a single page and return its readable text. */
export async function extractUrlText(url: string): Promise<string> {
  const v = validateUrl(url);
  if (!v.ok) throw new Error(v.error);

  const parsed = new URL(v.url);
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("That host is not allowed.");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(v.url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "KnovoraBot/1.0 (+https://knovora.app)",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
      },
    });
  } catch (e) {
    throw new Error(
      e instanceof Error && e.name === "AbortError"
        ? "The page took too long to respond."
        : "Could not fetch the page.",
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) throw new Error(`The page returned status ${res.status}.`);

  const contentType = res.headers.get("content-type") ?? "";
  const isTextual =
    contentType.includes("text/html") ||
    contentType.includes("application/xhtml") ||
    contentType.includes("text/plain");
  if (!isTextual) {
    throw new Error(`Unsupported content type: ${contentType || "unknown"}.`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_PAGE_BYTES) {
    throw new Error("The page is too large to ingest.");
  }

  const html = buf.toString("utf8");
  const { text } = contentType.includes("text/plain")
    ? { text: normalizeText(html) }
    : htmlToText(html);

  if (!text.trim()) throw new Error("No readable text was found on the page.");
  return text;
}
