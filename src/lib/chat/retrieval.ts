import { createAdminClient } from "@/lib/supabase/admin";
import { getEmbeddingProvider, toPgVector } from "@/lib/ingestion/embeddings";
import type { MatchChunkResult } from "@/lib/supabase/types";
import type { RetrievedChunk } from "./types";

/** Drop matches below this cosine similarity so off-topic questions fall back. */
export const SIMILARITY_THRESHOLD = 0.3;
export const DEFAULT_MATCH_COUNT = 6;

/**
 * Embed the query and retrieve the most similar chunks for ONE chatbot.
 * Scoping is enforced in SQL (match_chunks filters by p_chatbot_id), so this
 * can never return another bot's or workspace's content.
 */
export async function retrieveContext(
  chatbotId: string,
  query: string,
  matchCount: number = DEFAULT_MATCH_COUNT,
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  if (!q) return [];

  const provider = getEmbeddingProvider();
  const queryVector = await provider.embedQuery(q);

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("match_chunks", {
    p_chatbot_id: chatbotId,
    p_query_embedding: toPgVector(queryVector),
    p_match_count: matchCount,
  });
  if (error) throw new Error(`Retrieval failed: ${error.message}`);

  const matches = ((data ?? []) as MatchChunkResult[]).filter(
    (m) => m.similarity >= SIMILARITY_THRESHOLD,
  );
  if (matches.length === 0) return [];

  // Fetch source metadata for citations.
  const sourceIds = [...new Set(matches.map((m) => m.source_id))];
  const { data: sources } = await supabase
    .from("sources")
    .select("id, title, url")
    .in("id", sourceIds);

  const byId = new Map(
    (sources ?? []).map((s: { id: string; title: string | null; url: string | null }) => [
      s.id,
      s,
    ]),
  );

  return matches.map((m) => {
    const src = byId.get(m.source_id);
    return {
      content: m.content,
      sourceId: m.source_id,
      title: src?.title ?? null,
      url: src?.url ?? null,
      chunkIndex: m.chunk_index,
      similarity: m.similarity,
    };
  });
}
