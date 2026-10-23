import { createAdminClient } from "@/lib/supabase/admin";
import type { Source } from "@/lib/supabase/types";
import { extractText } from "./extract";
import { chunkText } from "./chunk";
import { estimateTokens } from "./normalize";
import { getEmbeddingProvider, toPgVector } from "./embeddings";

export type ProcessResult = { ok: boolean; chunks?: number; error?: string };

/**
 * Resolve the raw text for a source. File sources are downloaded from Storage;
 * URL sources carry their already-extracted text in `storage_path` is null and
 * are handled by the URL ingestion path (Task 7) which stores text in `url`'s
 * fetched content. Here we branch on type.
 */
async function getSourceText(
  supabase: ReturnType<typeof createAdminClient>,
  source: Source,
): Promise<string> {
  if (source.type === "file") {
    if (!source.storage_path) throw new Error("Missing storage path for file source.");
    const { data: blob, error } = await supabase.storage
      .from("knowledge")
      .download(source.storage_path);
    if (error || !blob) throw new Error(`Download failed: ${error?.message ?? "no file"}`);
    const buffer = Buffer.from(await blob.arrayBuffer());
    return extractText(buffer, source.filename ?? "file");
  }

  // URL sources: fetched + extracted by the URL ingestion module (Task 7),
  // which writes the extracted text into the dedicated fetch step. The
  // fetching helper is injected there; see ingestFromUrl.
  const { extractUrlText } = await import("./url");
  if (!source.url) throw new Error("Missing URL for url source.");
  return extractUrlText(source.url);
}

/**
 * Process one source end-to-end: extract → chunk → embed → store.
 * Idempotent (deletes prior chunks first) and restartable. Updates the source
 * and ingestion_jobs status rows, with bounded retries recorded as attempts.
 */
export async function processSource(sourceId: string): Promise<ProcessResult> {
  const supabase = createAdminClient();

  const { data: source } = await supabase
    .from("sources")
    .select("*")
    .eq("id", sourceId)
    .maybeSingle();

  if (!source) return { ok: false, error: "Source not found." };
  const src = source as Source;

  // Read current job attempts (create a job row if missing).
  const { data: existingJob } = await supabase
    .from("ingestion_jobs")
    .select("id, attempts, max_attempts")
    .eq("source_id", sourceId)
    .maybeSingle();

  const maxAttempts = existingJob?.max_attempts ?? 3;
  const attempts = (existingJob?.attempts ?? 0) + 1;

  // Mark processing.
  await supabase.from("sources").update({ status: "processing", error: null }).eq("id", sourceId);
  if (existingJob) {
    await supabase
      .from("ingestion_jobs")
      .update({ status: "processing", attempts, error: null })
      .eq("id", existingJob.id);
  } else {
    await supabase
      .from("ingestion_jobs")
      .insert({ source_id: sourceId, chatbot_id: src.chatbot_id, status: "processing", attempts });
  }

  try {
    const text = await getSourceText(supabase, src);
    if (!text.trim()) throw new Error("No extractable text found in the source.");

    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error("No chunks were produced from the source.");

    // Re-index: remove any existing chunks for this source first.
    await supabase.from("source_chunks").delete().eq("source_id", sourceId);

    const provider = getEmbeddingProvider();
    const vectors = await provider.embedDocuments(chunks);

    const rows = chunks.map((content, i) => ({
      source_id: sourceId,
      chatbot_id: src.chatbot_id,
      content,
      embedding: toPgVector(vectors[i]),
      chunk_index: i,
      token_count: estimateTokens(content),
    }));

    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from("source_chunks").insert(rows.slice(i, i + 100));
      if (error) throw new Error(`Failed to store chunks: ${error.message}`);
    }

    await supabase
      .from("sources")
      .update({ status: "ready", chunk_count: chunks.length, error: null })
      .eq("id", sourceId);
    await supabase
      .from("ingestion_jobs")
      .update({ status: "completed", error: null })
      .eq("source_id", sourceId);

    return { ok: true, chunks: chunks.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const exhausted = attempts >= maxAttempts;

    await supabase
      .from("sources")
      .update({ status: exhausted ? "failed" : "pending", error: message })
      .eq("id", sourceId);
    await supabase
      .from("ingestion_jobs")
      .update({ status: exhausted ? "failed" : "pending", error: message })
      .eq("source_id", sourceId);

    return { ok: false, error: message };
  }
}
