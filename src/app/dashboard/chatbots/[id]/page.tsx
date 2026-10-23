import { notFound } from "next/navigation";
import { getChatbot } from "@/lib/chatbots/queries";
import { ChatbotForm } from "../../ChatbotForm";
import { updateChatbot } from "../../actions";

export default async function ChatbotSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chatbot = await getChatbot(id);
  if (!chatbot) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <ChatbotForm mode="edit" action={updateChatbot} chatbot={chatbot} />
    </div>
  );
}
