import Link from "next/link";
import { notFound } from "next/navigation";
import { getChatbot } from "@/lib/chatbots/queries";
import { togglePublishAction, deleteChatbotAction } from "../../actions";
import { ChatbotTabs } from "./ChatbotTabs";

export default async function ChatbotLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const chatbot = await getChatbot(id);
  if (!chatbot) notFound();

  const isPublished = chatbot.status === "published";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Back to chatbots
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{chatbot.name}</h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isPublished ? "bg-green-100 text-green-700" : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {chatbot.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <form action={togglePublishAction}>
              <input type="hidden" name="id" value={chatbot.id} />
              <input type="hidden" name="next" value={isPublished ? "draft" : "published"} />
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-50"
              >
                {isPublished ? "Unpublish" : "Publish"}
              </button>
            </form>
            <form action={deleteChatbotAction}>
              <input type="hidden" name="id" value={chatbot.id} />
              <button
                type="submit"
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>

      <ChatbotTabs botId={chatbot.id} />

      <div>{children}</div>
    </div>
  );
}
