import { GoogleGenAI } from "@google/genai";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Chatbot, Citation } from "@/lib/supabase/types";
import type { ChatTurn } from "./types";
import { composeSystemInstructions } from "@/lib/chatbots/schema";
import { retrieveContext } from "./retrieval";
import {
  formatContext,
  buildSystemInstruction,
  buildContents,
  FALLBACK_MESSAGE,
} from "./prompt";

export interface RunChatInput {
  chatbot: Chatbot;
  sessionId: string;
  question: string;
  history: ChatTurn[];
  visitorIpHash?: string | null;
}

export interface ChatStreamResult {
  stream: ReadableStream<Uint8Array>;
  citations: Citation[];
}

type Usage = { promptTokenCount?: number; candidatesTokenCount?: number } | null;

/** Start the Gemini stream with one retry if the initial call fails. */
async function startGeneration(
  ai: GoogleGenAI,
  model: string,
  systemInstruction: string,
  contents: ReturnType<typeof buildContents>,
) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction, temperature: 0.3, maxOutputTokens: 1024 },
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr;
}

async function persist(input: {
  chatbot: Chatbot;
  sessionId: string;
  question: string;
  answer: string;
  citations: Citation[];
  usage: Usage;
  latencyMs: number;
  model: string;
  visitorIpHash?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("chatbot_id", input.chatbot.id)
    .eq("session_id", input.sessionId)
    .maybeSingle();

  let conversationId = existing?.id as string | undefined;
  if (!conversationId) {
    const { data: created } = await supabase
      .from("conversations")
      .insert({
        chatbot_id: input.chatbot.id,
        session_id: input.sessionId,
        visitor_ip_hash: input.visitorIpHash ?? null,
      })
      .select("id")
      .single();
    conversationId = created?.id;
  }
  if (!conversationId) return;

  await supabase.from("messages").insert([
    { conversation_id: conversationId, role: "user", content: input.question, citations: [] },
    {
      conversation_id: conversationId,
      role: "assistant",
      content: input.answer,
      citations: input.citations,
    },
  ]);

  await supabase.from("usage_events").insert({
    workspace_id: input.chatbot.workspace_id,
    chatbot_id: input.chatbot.id,
    conversation_id: conversationId,
    type: "chat",
    model: input.model,
    prompt_tokens: input.usage?.promptTokenCount ?? null,
    completion_tokens: input.usage?.candidatesTokenCount ?? null,
    latency_ms: input.latencyMs,
  });
}

/**
 * Retrieve context, build a grounded prompt, and stream Gemini's answer.
 * Falls back to an explicit "I don't know" on empty output or errors, and
 * persists the conversation + usage after streaming completes.
 */
export async function runChatStream(input: RunChatInput): Promise<ChatStreamResult> {
  const { chatbot, sessionId, question, history, visitorIpHash } = input;
  const env = serverEnv();

  const chunks = await retrieveContext(chatbot.id, question);
  const { text: contextText, citations } = formatContext(chunks);

  const base = composeSystemInstructions({
    name: chatbot.name,
    purpose: chatbot.purpose,
    tone: chatbot.tone,
    language: chatbot.language,
    custom: chatbot.system_instructions,
  });
  const systemInstruction = buildSystemInstruction(base, contextText);
  const contents = buildContents(history, question);

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const encoder = new TextEncoder();
  const startedAt = Date.now();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      let usage: Usage = null;

      try {
        const generation = await startGeneration(
          ai,
          env.GEMINI_CHAT_MODEL,
          systemInstruction,
          contents,
        );
        for await (const chunk of generation) {
          const text = chunk.text;
          if (text) {
            full += text;
            controller.enqueue(encoder.encode(text));
          }
          if (chunk.usageMetadata) usage = chunk.usageMetadata as Usage;
        }
        if (!full.trim()) {
          full = FALLBACK_MESSAGE;
          controller.enqueue(encoder.encode(full));
        }
      } catch {
        if (!full.trim()) {
          full = FALLBACK_MESSAGE;
          controller.enqueue(encoder.encode(full));
        }
      } finally {
        controller.close();
        await persist({
          chatbot,
          sessionId,
          question,
          answer: full,
          citations,
          usage,
          latencyMs: Date.now() - startedAt,
          model: env.GEMINI_CHAT_MODEL,
          visitorIpHash,
        }).catch(() => {
          /* logging failures must not break the response */
        });
      }
    },
  });

  return { stream, citations };
}
