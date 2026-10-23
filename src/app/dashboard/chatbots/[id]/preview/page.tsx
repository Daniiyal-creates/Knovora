import { notFound } from "next/navigation";
import { getChatbot } from "@/lib/chatbots/queries";
import { resolveAppearance } from "@/lib/chatbots/schema";
import { ChatBox } from "@/components/chat/ChatBox";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = await getChatbot(id);
  if (!bot) notFound();

  const appearance = resolveAppearance(bot.appearance);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Test your bot</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Ask questions as a visitor would. Cited sources are shown below each answer.
        </p>
      </div>
      <div className="max-w-md">
        <ChatBox
          mode="preview"
          chatbotId={bot.id}
          botName={bot.name}
          appearance={appearance}
          showSources
        />
      </div>
    </div>
  );
}
