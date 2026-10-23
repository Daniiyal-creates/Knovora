import Link from "next/link";
import { notFound } from "next/navigation";
import { getChatbot } from "@/lib/chatbots/queries";
import { resolveAppearance } from "@/lib/chatbots/schema";
import { publicEnv } from "@/lib/env";
import { CopyField } from "./CopyField";

export default async function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = await getChatbot(id);
  if (!bot) notFound();

  const base = publicEnv.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const hostedUrl = `${base}/chat/${bot.public_id}`;
  const isPublished = bot.status === "published";

  const appearance = resolveAppearance(bot.appearance);
  const snippet =
    `<script src="${base}/widget.js"\n` +
    `  data-knovora-id="${bot.public_id}"\n` +
    `  data-position="${appearance.widgetPosition ?? "bottom-right"}"\n` +
    `  data-color="${appearance.themeColor ?? "#4f46e5"}"\n` +
    `  async></script>`;

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold">Publish &amp; share</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Share a hosted chat page. The bot must be published to respond to visitors.
        </p>
      </div>

      {!isPublished ? (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This bot is a <strong>draft</strong>. Use the <strong>Publish</strong> button above to make
          it live before sharing.
        </div>
      ) : null}

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <CopyField label="Hosted chat link" value={hostedUrl} />
        <div className="mt-3">
          <Link
            href={hostedUrl}
            target="_blank"
            className="text-sm font-medium text-brand hover:underline"
          >
            Open hosted chat ↗
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <CopyField label="Website embed snippet" value={snippet} multiline />
        <p className="mt-2 text-xs text-neutral-500">
          Paste this before <code>&lt;/body&gt;</code> on any page. A chat button appears in the
          corner; it loads the chat only when opened.
        </p>
      </div>
    </div>
  );
}
