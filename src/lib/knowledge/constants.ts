/** Shared knowledge-ingestion limits and validation (client + server). */

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md"] as const;
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

export function getExtension(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export type FileValidation = { ok: true } | { ok: false; error: string };

/** Validate a candidate upload by name + size. Used on client and server. */
export function validateFile(input: { name: string; size: number }): FileValidation {
  const ext = getExtension(input.name);
  if (!ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    return {
      ok: false,
      error: `Unsupported file type${ext ? ` ".${ext}"` : ""}. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }
  if (input.size <= 0) return { ok: false, error: "File appears to be empty." };
  if (input.size > MAX_FILE_BYTES) {
    return { ok: false, error: `File is too large. Maximum is ${MAX_FILE_BYTES / 1024 / 1024} MB.` };
  }
  return { ok: true };
}

/** Make a filename safe for a storage key. */
export function sanitizeFilename(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(0, 120) || "file";
}

export type UrlValidation = { ok: true; url: string } | { ok: false; error: string };

/** Validate a user-supplied URL for ingestion (http/https only). */
export function validateUrl(raw: string): UrlValidation {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter a URL." };
  if (trimmed.length > 2000) return { ok: false, error: "URL is too long." };
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return { ok: false, error: "Enter a valid URL (including https://)." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are allowed." };
  }
  return { ok: true, url: u.toString() };
}

/** Block localhost / private / link-local hosts to limit SSRF. */
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1") return true;
  // IPv4 literals in private / loopback / link-local ranges.
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 127 || a === 0 || a === 10) return true;
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
}
