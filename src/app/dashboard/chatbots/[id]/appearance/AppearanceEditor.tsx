"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Appearance } from "@/lib/supabase/types";
import { parseStarterPrompts, MAX_STARTER_PROMPTS } from "@/lib/chatbots/schema";
import { ChatBox } from "@/components/chat/ChatBox";
import { updateAppearance } from "./actions";

export function AppearanceEditor({
  chatbotId,
  botName,
  initial,
}: {
  chatbotId: string;
  botName: string;
  initial: Appearance;
}) {
  const router = useRouter();
  const [themeColor, setThemeColor] = useState(initial.themeColor || "#4f46e5");
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl || "");
  const [welcome, setWelcome] = useState(initial.welcomeMessage || "");
  const [startersText, setStartersText] = useState((initial.starterPrompts ?? []).join("\n"));
  const [position, setPosition] = useState<Appearance["widgetPosition"]>(
    initial.widgetPosition || "bottom-right",
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const appearance: Appearance = useMemo(
    () => ({
      themeColor,
      avatarUrl: avatarUrl || undefined,
      welcomeMessage: welcome || undefined,
      starterPrompts: parseStarterPrompts(startersText),
      widgetPosition: position,
    }),
    [themeColor, avatarUrl, welcome, startersText, position],
  );

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const res = await updateAppearance(chatbotId, appearance);
    setSaving(false);
    if (res.error) {
      setError(res.error);
    } else {
      setMessage("Appearance saved.");
      router.refresh();
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <h2 className="text-lg font-semibold">Appearance</h2>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Theme color
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="h-9 w-12 rounded border border-neutral-300"
            />
            <input
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Avatar URL (optional)
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…/avatar.png"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Welcome message
          <textarea
            value={welcome}
            onChange={(e) => setWelcome(e.target.value)}
            rows={2}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Suggested prompts (one per line, up to {MAX_STARTER_PROMPTS})
          <textarea
            value={startersText}
            onChange={(e) => setStartersText(e.target.value)}
            rows={4}
            placeholder={"What are your hours?\nHow do refunds work?"}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Widget position
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Appearance["widgetPosition"])}
            className="w-48 rounded-md border border-neutral-300 px-3 py-2 text-sm font-normal"
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
          </select>
        </label>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save appearance"}
          </button>
          {message ? <span className="text-sm text-green-600">{message}</span> : null}
          {error ? <span className="text-sm text-red-600">{error}</span> : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium text-neutral-500">Live preview</h3>
        <ChatBox
          mode="preview"
          chatbotId={chatbotId}
          botName={botName}
          appearance={appearance}
          showSources
        />
      </div>
    </div>
  );
}
