import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role Supabase client. BYPASSES RLS — server-only.
 * Use for visitor-facing writes (conversations/messages/usage) and background
 * ingestion, always scoping queries manually (e.g. by chatbot id).
 * NEVER import this into a client component or the public widget bundle.
 */
export function createAdminClient() {
  return createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SECRET_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
