import { createClient } from "@/lib/supabase/server";
import type { Source } from "@/lib/supabase/types";

/** List sources for a chatbot (RLS restricts to the owner). */
export async function listSources(chatbotId: string): Promise<Source[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("chatbot_id", chatbotId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Source[];
}
