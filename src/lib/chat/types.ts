import type { Citation } from "@/lib/supabase/types";

export interface RetrievedChunk {
  content: string;
  sourceId: string;
  title: string | null;
  url: string | null;
  chunkIndex: number;
  similarity: number;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/** Gemini content shape (kept SDK-free so prompt assembly stays pure). */
export interface GeminiContent {
  role: "user" | "model";
  parts: { text: string }[];
}

export type { Citation };
