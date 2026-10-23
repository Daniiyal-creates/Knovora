import { createClient } from "@/lib/supabase/server";
import type { Chatbot } from "@/lib/supabase/types";

/** List all chatbots in a workspace (RLS restricts to the owner). */
export async function listChatbots(workspaceId: string): Promise<Chatbot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chatbots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Chatbot[];
}

/** Fetch a single chatbot by id. Returns null if not found or not owned. */
export async function getChatbot(id: string): Promise<Chatbot | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("chatbots").select("*").eq("id", id).maybeSingle();
  return (data as Chatbot | null) ?? null;
}
