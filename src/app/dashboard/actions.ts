"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/auth";
import { chatbotConfigSchema, DEFAULT_APPEARANCE, parseAllowedDomains } from "@/lib/chatbots/schema";
import { generatePublicId } from "@/lib/utils";

export type ChatbotFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(formData: FormData) {
  return chatbotConfigSchema.safeParse({
    name: formData.get("name") ?? "",
    purpose: formData.get("purpose") ?? undefined,
    language: formData.get("language") ?? "en",
    tone: formData.get("tone") ?? undefined,
    system_instructions: formData.get("system_instructions") ?? undefined,
  });
}

function fieldErrorsFrom(parsed: ReturnType<typeof parseForm>): ChatbotFormState {
  if (parsed.success) return {};
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors };
}

export async function createChatbot(
  _prev: ChatbotFormState,
  formData: FormData,
): Promise<ChatbotFormState> {
  const workspace = await requireWorkspace();
  const parsed = parseForm(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chatbots")
    .insert({
      workspace_id: workspace.id,
      name: parsed.data.name,
      purpose: parsed.data.purpose || null,
      language: parsed.data.language,
      tone: parsed.data.tone || null,
      system_instructions: parsed.data.system_instructions || null,
      status: "draft",
      public_id: generatePublicId(),
      appearance: DEFAULT_APPEARANCE,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect(`/dashboard/chatbots/${data.id}`);
}

export async function updateChatbot(
  _prev: ChatbotFormState,
  formData: FormData,
): Promise<ChatbotFormState> {
  await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing chatbot id." };

  const parsed = parseForm(formData);
  if (!parsed.success) return fieldErrorsFrom(parsed);

  const allowedDomains = parseAllowedDomains(String(formData.get("allowed_domains") ?? ""));

  const supabase = await createClient();
  const { error } = await supabase
    .from("chatbots")
    .update({
      name: parsed.data.name,
      purpose: parsed.data.purpose || null,
      language: parsed.data.language,
      tone: parsed.data.tone || null,
      system_instructions: parsed.data.system_instructions || null,
      allowed_domains: allowedDomains,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/chatbots/${id}`);
  revalidatePath("/dashboard");
  return {};
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!id || (next !== "draft" && next !== "published")) return;

  const supabase = await createClient();
  await supabase.from("chatbots").update({ status: next }).eq("id", id);
  revalidatePath(`/dashboard/chatbots/${id}`);
  revalidatePath("/dashboard");
}

export async function deleteChatbotAction(formData: FormData): Promise<void> {
  await requireWorkspace();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("chatbots").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
