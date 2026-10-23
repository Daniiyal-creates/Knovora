import { z } from "zod";

/**
 * Centralized, validated environment access.
 *
 * - `publicEnv` holds values safe to ship to the browser (NEXT_PUBLIC_*).
 * - `serverEnv()` holds server-only secrets and throws if accessed where they
 *   are missing. Never import `serverEnv` into client components or the widget.
 *
 * Supabase key naming: this project uses the newer key scheme —
 *   publishable key (`sb_publishable_...`) in place of the legacy anon key, and
 *   secret key (`sb_secret_...`) in place of the legacy service_role key.
 * Legacy env names are still accepted as a fallback.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  GEMINI_CHAT_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  GEMINI_EMBEDDING_DIM: z.coerce.number().int().positive().default(768),
  // Optional shared secret protecting the background ingestion endpoint.
  INGEST_SECRET: z.string().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;

/** Parse and cache server-only secrets. Throws if required secrets are absent. */
export function serverEnv(): ServerEnv {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = serverSchema.parse({
    SUPABASE_SECRET_KEY:
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_CHAT_MODEL: process.env.GEMINI_CHAT_MODEL,
    GEMINI_EMBEDDING_MODEL: process.env.GEMINI_EMBEDDING_MODEL,
    GEMINI_EMBEDDING_DIM: process.env.GEMINI_EMBEDDING_DIM,
    INGEST_SECRET: process.env.INGEST_SECRET,
  });
  return cachedServerEnv;
}
