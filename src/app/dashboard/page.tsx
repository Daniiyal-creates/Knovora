import Link from "next/link";
import { requireWorkspace } from "@/lib/auth";
import { listChatbots } from "@/lib/chatbots/queries";

export default async function DashboardHome() {
  const workspace = await requireWorkspace();
  const chatbots = await listChatbots(workspace.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your chatbots</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Create a chatbot, add knowledge, and publish it to your site.
          </p>
        </div>
        <Link
          href="/dashboard/chatbots/new"
          className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90"
        >
          New chatbot
        </Link>
      </div>

      {chatbots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-neutral-600">No chatbots yet. Create your first one to get started.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chatbots.map((bot) => (
            <li key={bot.id}>
              <Link
                href={`/dashboard/chatbots/${bot.id}`}
                className="block rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-brand hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">{bot.name}</h2>
                  <StatusBadge status={bot.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-neutral-600">
                  {bot.purpose || "No purpose set."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "published" }) {
  const styles =
    status === "published"
      ? "bg-green-100 text-green-700"
      : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{status}</span>
  );
}
