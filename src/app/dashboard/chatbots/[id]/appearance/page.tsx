import { notFound } from "next/navigation";
import { getChatbot } from "@/lib/chatbots/queries";
import { resolveAppearance } from "@/lib/chatbots/schema";
import { AppearanceEditor } from "./AppearanceEditor";

export default async function AppearancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = await getChatbot(id);
  if (!bot) notFound();

  return (
    <AppearanceEditor
      chatbotId={bot.id}
      botName={bot.name}
      initial={resolveAppearance(bot.appearance)}
    />
  );
}
