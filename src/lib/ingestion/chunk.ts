export interface ChunkOptions {
  /** Maximum characters per chunk (~4 chars per token). */
  maxChars?: number;
  /** Characters of overlap carried between consecutive chunks. */
  overlap?: number;
}

/**
 * Split text into overlapping chunks using a sliding window that snaps to
 * whitespace so words are not cut in half. Deterministic and side-effect free.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1200;
  if (maxChars <= 0) throw new Error("maxChars must be positive");

  // Default overlap scales with chunk size so small maxChars stays valid.
  const overlap = opts.overlap ?? Math.min(200, Math.floor(maxChars / 3));
  if (overlap >= maxChars) throw new Error("overlap must be smaller than maxChars");

  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);

    // Snap end back to the last whitespace to avoid splitting a word.
    if (end < clean.length) {
      const ws = clean.lastIndexOf(" ", end);
      if (ws > start) end = ws;
    }

    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= clean.length) break;

    // Next window starts `overlap` chars before the current end, then snaps
    // forward to a word boundary so chunks never begin mid-word.
    let nextStart = end - overlap;
    if (nextStart <= start) {
      nextStart = end; // no room for overlap; move on to guarantee progress
    } else {
      const prevSpace = clean.lastIndexOf(" ", nextStart);
      if (prevSpace > start) nextStart = prevSpace + 1;
    }
    start = nextStart;
  }

  return chunks;
}
