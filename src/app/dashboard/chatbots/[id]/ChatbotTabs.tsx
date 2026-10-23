"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Settings" },
  { slug: "knowledge", label: "Knowledge" },
  { slug: "appearance", label: "Appearance" },
  { slug: "preview", label: "Preview" },
  { slug: "publish", label: "Publish" },
];

export function ChatbotTabs({ botId }: { botId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/chatbots/${botId}`;

  return (
    <nav className="flex gap-1 border-b border-neutral-200">
      {TABS.map((tab) => {
        const href = tab.slug ? `${base}/${tab.slug}` : base;
        const active = tab.slug ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={tab.slug || "settings"}
            href={href}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              active
                ? "border-brand text-brand"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
