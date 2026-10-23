import { createAdminClient } from "@/lib/supabase/admin";
import type { Chatbot } from "@/lib/supabase/types";

/**
 * Load a chatbot by its public id for visitor-facing surfaces. Returns the bot
 * only if it exists AND is published. Uses the admin client (no session) and
 * is the single scoped path for public access.
 */
export async function getPublishedChatbot(publicId: string): Promise<Chatbot | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("chatbots")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();

  const bot = data as Chatbot | null;
  if (!bot || bot.status !== "published") return null;
  return bot;
}
