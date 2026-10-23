"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/auth";
import { getChatbot } from "@/lib/chatbots/queries";
import { appearanceSchema } from "@/lib/chatbots/schema";
import type { Appearance } from "@/lib/supabase/types";

export async function updateAppearance(
  chatbotId: string,
  appearance: Appearance,
): Promise<{ error?: string }> {
  const workspace = await requireWorkspace();
  const bot = await getChatbot(chatbotId);
  if (!bot || bot.workspace_id !== workspace.id) return { error: "Chatbot not found." };

  const parsed = appearanceSchema.safeParse(appearance);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid appearance." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("chatbots")
    .update({ appearance: parsed.data })
    .eq("id", chatbotId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/chatbots/${chatbotId}/appearance`);
  revalidatePath(`/dashboard/chatbots/${chatbotId}/preview`);
  return {};
}
