import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedChatbot } from "@/lib/chatbots/public";
import { resolveAppearance } from "@/lib/chatbots/schema";
import { ChatBox } from "@/components/chat/ChatBox";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  const bot = await getPublishedChatbot(publicId);
  return { title: bot ? `${bot.name} — Chat` : "Chat" };
}

export default async function HostedChatPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const bot = await getPublishedChatbot(publicId);
  if (!bot) notFound();

  const appearance = resolveAppearance(bot.appearance);

  return (
    <main className="mx-auto flex h-screen max-w-2xl flex-col p-4">
      <div className="min-h-0 flex-1">
        <ChatBox
          mode="public"
          publicId={bot.public_id}
          botName={bot.name}
          appearance={appearance}
          fill
        />
      </div>
      <p className="pt-2 text-center text-xs text-neutral-400">Powered by Knovora</p>
    </main>
  );
}
