import Link from "next/link";
import { ChatbotForm } from "../../ChatbotForm";
import { createChatbot } from "../../actions";

export default function NewChatbotPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Back to chatbots
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New chatbot</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Give your bot a name and purpose. You can refine everything later.
        </p>
      </div>
      <ChatbotForm mode="create" action={createChatbot} />
    </div>
  );
}
