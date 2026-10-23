"use client";

import { useEffect, useRef, useState } from "react";
import type { Appearance, Citation } from "@/lib/supabase/types";

export interface ChatBoxProps {
  mode: "preview" | "public";
  chatbotId?: string;
  publicId?: string;
  botName: string;
  appearance: Appearance;
  /** Show cited source titles under answers (owner preview). */
  showSources?: boolean;
  /** Fill the container height (hosted page / widget). */
  fill?: boolean;
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

function newSession() {
  return "sess-" + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2));
}

export function ChatBox({
  mode,
  chatbotId,
  publicId,
  botName,
  appearance,
  showSources = false,
  fill = false,
}: ChatBoxProps) {
  const theme = appearance.themeColor || "#4f46e5";
  const welcome = appearance.welcomeMessage || "Hi! How can I help you today?";
  const starters = appearance.starterPrompts ?? [];

  const [sessionId, setSessionId] = useState(newSession);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || sending) return;
    setInput("");

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "" },
    ]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatbotId, publicId, sessionId, message: question, history }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Request failed (${res.status})`);
      }

      const citHeader = res.headers.get("x-citations");
      let citations: Citation[] = [];
      if (citHeader) {
        try {
          citations = JSON.parse(atob(citHeader));
        } catch {
          citations = [];
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: acc, citations };
          return next;
        });
      }
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: acc || "Sorry, something went wrong.",
          citations,
        };
        return next;
      });
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Sorry, I couldn't respond right now. Please try again.",
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setMessages([]);
    setInput("");
    setSessionId(newSession());
  }

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white ${
        fill ? "h-full" : "h-[32rem]"
      }`}
    >
      <div
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: theme }}
      >
        <span className="font-semibold">{botName}</span>
        <button
          onClick={reset}
          className="rounded px-2 py-1 text-xs font-medium text-white/90 hover:bg-white/15"
        >
          Reset
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        <Bubble role="assistant" theme={theme}>
          {welcome}
        </Bubble>

        {messages.length === 0 && starters.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {starters.map((s, i) => (
              <button
                key={i}
                onClick={() => send(s)}
                className="rounded-full border border-neutral-300 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i}>
            <Bubble role={m.role} theme={theme}>
              {m.content || (m.role === "assistant" && sending ? "…" : "")}
            </Bubble>
            {m.role === "assistant" && showSources && m.citations && m.citations.length > 0 ? (
              <div className="mt-1 pl-1 text-xs text-neutral-500">
                Sources:{" "}
                {m.citations.map((c, n) => (
                  <span key={c.sourceId}>
                    {n > 0 ? ", " : ""}
                    [{n + 1}]{" "}
                    {c.url ? (
                      <a href={c.url} target="_blank" rel="noreferrer" className="underline">
                        {c.title || c.url}
                      </a>
                    ) : (
                      c.title || "source"
                    )}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-neutral-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={sending}
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: theme }}
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
      {mode === "preview" ? (
        <p className="px-3 pb-2 text-center text-[11px] text-neutral-400">
          Preview mode — responses use your current knowledge and settings.
        </p>
      ) : null}
    </div>
  );
}

function Bubble({
  role,
  theme,
  children,
}: {
  role: "user" | "assistant";
  theme: string;
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
          isUser ? "text-white" : "bg-neutral-100 text-neutral-800"
        }`}
        style={isUser ? { backgroundColor: theme } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
