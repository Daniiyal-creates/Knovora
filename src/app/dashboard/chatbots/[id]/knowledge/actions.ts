"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/auth";
import { getChatbot } from "@/lib/chatbots/queries";
import { validateFile, validateUrl } from "@/lib/knowledge/constants";
import { processSource } from "@/lib/ingestion/process";

export type RegisterResult = { error?: string; sourceId?: string };
export type ProcessResult = { ok: boolean; chunks?: number; error?: string };

/** Verify the source belongs to the current user's workspace. */
async function assertOwnedSource(sourceId: string): Promise<string | null> {
  const workspace = await requireWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sources")
    .select("id, workspace_id, chatbot_id")
    .eq("id", sourceId)
    .maybeSingle();
  if (!data || data.workspace_id !== workspace.id) return null;
  return data.chatbot_id as string;
}

/**
 * Run ingestion for a source (owner-authorized). Called right after upload and
 * by the manual retry button. Awaits processing so the UI can show the result.
 */
export async function processSourceAction(sourceId: string): Promise<ProcessResult> {
  const chatbotId = await assertOwnedSource(sourceId);
  if (!chatbotId) return { ok: false, error: "Source not found." };

  const result = await processSource(sourceId);
  revalidatePath(`/dashboard/chatbots/${chatbotId}/knowledge`);
  return result;
}

/**
 * Records an uploaded file as a `source` (status pending) and enqueues an
 * ingestion job. The file itself was uploaded directly to Storage by the
 * browser; this only creates the DB rows. Task 6 processes the job.
 */
export async function registerFileSource(input: {
  chatbotId: string;
  storagePath: string;
  filename: string;
  byteSize: number;
}): Promise<RegisterResult> {
  const workspace = await requireWorkspace();

  const bot = await getChatbot(input.chatbotId);
  if (!bot || bot.workspace_id !== workspace.id) {
    return { error: "Chatbot not found." };
  }

  // Re-validate server-side (never trust the client).
  const v = validateFile({ name: input.filename, size: input.byteSize });
  if (!v.ok) return { error: v.error };

  const supabase = await createClient();

  const { data: source, error } = await supabase
    .from("sources")
    .insert({
      chatbot_id: bot.id,
      workspace_id: workspace.id,
      type: "file",
      title: input.filename,
      filename: input.filename,
      storage_path: input.storagePath,
      byte_size: input.byteSize,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: jobErr } = await supabase.from("ingestion_jobs").insert({
    source_id: source.id,
    chatbot_id: bot.id,
    status: "pending",
  });
  if (jobErr) return { error: jobErr.message };

  revalidatePath(`/dashboard/chatbots/${bot.id}/knowledge`);
  // Task 6 triggers processing of the pending job here.
  return { sourceId: source.id };
}

/** Register a single-page URL as a source (status pending) + enqueue a job. */
export async function addUrlSource(input: {
  chatbotId: string;
  url: string;
}): Promise<RegisterResult> {
  const workspace = await requireWorkspace();

  const bot = await getChatbot(input.chatbotId);
  if (!bot || bot.workspace_id !== workspace.id) {
    return { error: "Chatbot not found." };
  }

  const v = validateUrl(input.url);
  if (!v.ok) return { error: v.error };

  const supabase = await createClient();
  const host = new URL(v.url).hostname;

  const { data: source, error } = await supabase
    .from("sources")
    .insert({
      chatbot_id: bot.id,
      workspace_id: workspace.id,
      type: "url",
      title: host,
      url: v.url,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: jobErr } = await supabase.from("ingestion_jobs").insert({
    source_id: source.id,
    chatbot_id: bot.id,
    status: "pending",
  });
  if (jobErr) return { error: jobErr.message };

  revalidatePath(`/dashboard/chatbots/${bot.id}/knowledge`);
  return { sourceId: source.id };
}

export async function deleteSource(formData: FormData): Promise<void> {
  const workspace = await requireWorkspace();
  const sourceId = String(formData.get("sourceId") ?? "");
  const chatbotId = String(formData.get("chatbotId") ?? "");
  if (!sourceId) return;

  const supabase = await createClient();

  // Remove the stored object (if any) before deleting the row.
  const { data: src } = await supabase
    .from("sources")
    .select("storage_path, workspace_id")
    .eq("id", sourceId)
    .maybeSingle();

  if (src && src.workspace_id === workspace.id && src.storage_path) {
    await supabase.storage.from("knowledge").remove([src.storage_path]);
  }

  await supabase.from("sources").delete().eq("id", sourceId);
  revalidatePath(`/dashboard/chatbots/${chatbotId}/knowledge`);
}
