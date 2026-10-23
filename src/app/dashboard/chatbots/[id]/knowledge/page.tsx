import { notFound } from "next/navigation";
import { getChatbot } from "@/lib/chatbots/queries";
import { listSources } from "@/lib/knowledge/queries";
import { KnowledgeManager } from "./KnowledgeManager";

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bot = await getChatbot(id);
  if (!bot) notFound();

  const sources = await listSources(id);

  return (
    <KnowledgeManager chatbotId={bot.id} workspaceId={bot.workspace_id} sources={sources} />
  );
}
