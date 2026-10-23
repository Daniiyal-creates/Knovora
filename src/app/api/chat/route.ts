import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runChatStream } from "@/lib/chat/engine";
import type { Chatbot } from "@/lib/supabase/types";
import type { ChatTurn } from "@/lib/chat/types";
import { checkRateLimit } from "@/lib/ratelimit";
import { getClientIp, hashIp } from "@/lib/request";
import { hostOf } from "@/lib/chatbots/schema";
import { publicEnv } from "@/lib/env";

export const maxDuration = 60;

// Public chat limits (best-effort, per serverless instance).
const PER_IP_LIMIT = 20;
const PER_BOT_LIMIT = 120;
const WINDOW_MS = 60_000;

type Body = {
  chatbotId?: string;
  publicId?: string;
  sessionId?: string;
  message?: string;
  history?: { role?: unknown; content?: unknown }[];
};

function cleanHistory(raw: Body["history"]): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (h): h is ChatTurn =>
        (h?.role === "user" || h?.role === "assistant") && typeof h?.content === "string",
    )
    .slice(-12);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  const message = body?.message?.trim();
  const sessionId = body?.sessionId?.trim();

  if (!message || !sessionId) {
    return NextResponse.json({ error: "message and sessionId are required." }, { status: 400 });
  }

  let chatbot: Chatbot | null = null;
  let visitorIpHash: string | null = null;

  if (body?.chatbotId) {
    // Owner preview: must be signed in and own the bot (draft allowed).
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const admin = createAdminClient();
    const { data: bot } = await admin
      .from("chatbots")
      .select("*")
      .eq("id", body.chatbotId)
      .maybeSingle();
    if (!bot) return NextResponse.json({ error: "Not found." }, { status: 404 });

    const { data: ws } = await admin
      .from("workspaces")
      .select("owner_id")
      .eq("id", (bot as Chatbot).workspace_id)
      .maybeSingle();
    if (!ws || ws.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    chatbot = bot as Chatbot;
  } else if (body?.publicId) {
    // Public: bot must exist and be published.
    const admin = createAdminClient();
    const { data: bot } = await admin
      .from("chatbots")
      .select("*")
      .eq("public_id", body.publicId)
      .maybeSingle();
    if (!bot || (bot as Chatbot).status !== "published") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    chatbot = bot as Chatbot;

    // Allowed-domain check: if the bot restricts domains and the request has an
    // Origin, it must be our own app (hosted page / iframe) or an allowlisted host.
    const domains = (chatbot as Chatbot).allowed_domains ?? [];
    const origin = req.headers.get("origin");
    if (domains.length > 0 && origin) {
      const reqHost = hostOf(origin);
      const appHost = hostOf(publicEnv.NEXT_PUBLIC_APP_URL);
      const allowed = reqHost !== null && (reqHost === appHost || domains.includes(reqHost));
      if (!allowed) {
        return NextResponse.json({ error: "This domain is not allowed." }, { status: 403 });
      }
    }

    // Rate limit public traffic per IP and per bot.
    const ipHash = hashIp(getClientIp(req));
    visitorIpHash = ipHash;
    const perIp = checkRateLimit(`chat:ip:${ipHash}`, PER_IP_LIMIT, WINDOW_MS);
    const perBot = checkRateLimit(`chat:bot:${chatbot.id}`, PER_BOT_LIMIT, WINDOW_MS);
    if (!perIp.allowed || !perBot.allowed) {
      const resetMs = !perIp.allowed ? perIp.resetMs : perBot.resetMs;
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(resetMs / 1000)) } },
      );
    }
  } else {
    return NextResponse.json({ error: "chatbotId or publicId is required." }, { status: 400 });
  }

  const { stream, citations } = await runChatStream({
    chatbot,
    sessionId,
    question: message,
    history: cleanHistory(body?.history),
    visitorIpHash,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Citations": Buffer.from(JSON.stringify(citations)).toString("base64"),
    },
  });
}
