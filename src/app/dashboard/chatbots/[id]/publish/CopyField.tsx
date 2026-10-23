"use client";

import { useState } from "react";

export function CopyField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; the field is still selectable */
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <button
          onClick={copy}
          className="rounded border border-neutral-300 px-2 py-1 text-xs font-medium hover:bg-neutral-50"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {multiline ? (
        <textarea
          readOnly
          value={value}
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs"
        />
      ) : (
        <input
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 font-mono text-xs"
        />
      )}
    </div>
  );
}
