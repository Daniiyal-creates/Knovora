// Hand-maintained database types for the Knovora slice.
// Keep in sync with supabase/migrations. Regenerate with the Supabase CLI
// (`supabase gen types typescript`) once the project is linked, if preferred.

export type ChatbotStatus = "draft" | "published";
export type SourceType = "file" | "url";
export type SourceStatus = "pending" | "processing" | "ready" | "failed";
export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type MessageRole = "user" | "assistant";

export interface Appearance {
  themeColor?: string;
  avatarUrl?: string;
  welcomeMessage?: string;
  starterPrompts?: string[];
  widgetPosition?: "bottom-right" | "bottom-left";
}

export interface Citation {
  sourceId: string;
  title: string | null;
  url: string | null;
  chunkIndex: number;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export interface Chatbot {
  id: string;
  workspace_id: string;
  name: string;
  purpose: string | null;
  language: string;
  tone: string | null;
  system_instructions: string | null;
  status: ChatbotStatus;
  public_id: string;
  appearance: Appearance;
  allowed_domains: string[];
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  chatbot_id: string;
  workspace_id: string;
  type: SourceType;
  title: string | null;
  filename: string | null;
  storage_path: string | null;
  url: string | null;
  byte_size: number | null;
  status: SourceStatus;
  error: string | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface SourceChunk {
  id: string;
  source_id: string;
  chatbot_id: string;
  content: string;
  embedding: number[] | null;
  chunk_index: number;
  token_count: number | null;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  source_id: string;
  chatbot_id: string;
  status: JobStatus;
  attempts: number;
  max_attempts: number;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  session_id: string;
  visitor_ip_hash: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  created_at: string;
}

export interface MatchChunkResult {
  id: string;
  source_id: string;
  content: string;
  chunk_index: number;
  similarity: number;
}
