import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "@/lib/env";

/**
 * Embedding abstraction so the model can be swapped later (e.g. local Sentence
 * Transformers) without touching ingestion/retrieval. Do not mix vector spaces:
 * if the provider changes, re-index all content and update the column dimension.
 */
export interface EmbeddingProvider {
  readonly dimension: number;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

/** L2-normalize so reduced-dimension vectors behave well under cosine. */
function l2normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum) || 1;
  return v.map((x) => x / norm);
}

const BATCH_SIZE = 50;

class GeminiEmbeddingProvider implements EmbeddingProvider {
  readonly dimension: number;
  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    const env = serverEnv();
    this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    this.model = env.GEMINI_EMBEDDING_MODEL;
    this.dimension = env.GEMINI_EMBEDDING_DIM;
  }

  private async embed(texts: string[], taskType: string): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const resp = await this.ai.models.embedContent({
        model: this.model,
        contents: batch,
        config: { outputDimensionality: this.dimension, taskType },
      });
      const embs = resp.embeddings ?? [];
      if (embs.length !== batch.length) {
        throw new Error(
          `Embedding count mismatch: expected ${batch.length}, got ${embs.length}`,
        );
      }
      for (const e of embs) out.push(l2normalize(e.values ?? []));
    }
    return out;
  }

  embedDocuments(texts: string[]): Promise<number[][]> {
    return this.embed(texts, "RETRIEVAL_DOCUMENT");
  }

  async embedQuery(text: string): Promise<number[]> {
    const [vec] = await this.embed([text], "RETRIEVAL_QUERY");
    return vec;
  }
}

let provider: EmbeddingProvider | null = null;

/** Returns the configured embedding provider (lazy singleton). */
export function getEmbeddingProvider(): EmbeddingProvider {
  if (!provider) provider = new GeminiEmbeddingProvider();
  return provider;
}

/** Format a vector for insertion into a pgvector column. */
export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
