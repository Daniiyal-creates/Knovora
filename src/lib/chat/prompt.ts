import type { RetrievedChunk, Citation, ChatTurn, GeminiContent } from "./types";

export const FALLBACK_MESSAGE =
  "I'm sorry, I don't have information about that in my knowledge base.";

/** How many prior turns of conversation to keep (limited memory). */
export const DEFAULT_HISTORY_TURNS = 6;

/**
 * Format retrieved chunks into a numbered context block and a matching list of
 * citations. Chunks are grouped by source so each source gets one stable
 * number, which the model is told to cite as [n].
 */
export function formatContext(chunks: RetrievedChunk[]): {
  text: string;
  citations: Citation[];
} {
  const citations: Citation[] = [];
  const numberBySource = new Map<string, number>();
  const blocks: string[] = [];

  for (const chunk of chunks) {
    let n = numberBySource.get(chunk.sourceId);
    if (n === undefined) {
      n = citations.length + 1;
      numberBySource.set(chunk.sourceId, n);
      citations.push({
        sourceId: chunk.sourceId,
        title: chunk.title,
        url: chunk.url,
        chunkIndex: chunk.chunkIndex,
      });
    }
    const label = chunk.title || chunk.url || "source";
    blocks.push(`[${n}] (${label})\n${chunk.content}`);
  }

  return { text: blocks.join("\n\n"), citations };
}

/**
 * Combine the bot's base system instructions (already carrying grounding
 * guardrails) with the retrieved knowledge context.
 */
export function buildSystemInstruction(baseInstructions: string, contextText: string): string {
  if (!contextText.trim()) {
    return (
      baseInstructions +
      "\n\nKNOWLEDGE SOURCES:\n(No relevant sources were found for this question. " +
      "Tell the user you don't have that information. Do not make anything up.)"
    );
  }
  return (
    baseInstructions +
    "\n\nKNOWLEDGE SOURCES (answer only from these; cite the sources you use as [number]):\n" +
    contextText
  );
}

/** Build the Gemini `contents` array from limited history + the new question. */
export function buildContents(
  history: ChatTurn[],
  question: string,
  maxTurns: number = DEFAULT_HISTORY_TURNS,
): GeminiContent[] {
  const trimmed = history.slice(-maxTurns);
  const contents: GeminiContent[] = trimmed.map((t) => ({
    role: t.role === "assistant" ? "model" : "user",
    parts: [{ text: t.content }],
  }));
  contents.push({ role: "user", parts: [{ text: question }] });
  return contents;
}
