"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  validateFile,
  sanitizeFilename,
  ALLOWED_EXTENSIONS,
  MAX_FILE_BYTES,
} from "@/lib/knowledge/constants";
import type { Source, SourceStatus } from "@/lib/supabase/types";
import { validateUrl } from "@/lib/knowledge/constants";
import { registerFileSource, deleteSource, processSourceAction, addUrlSource } from "./actions";

export function KnowledgeManager({
  chatbotId,
  workspaceId,
  sources,
}: {
  chatbotId: string;
  workspaceId: string;
  sources: Source[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  // Auto-refresh while anything is still processing so status updates appear.
  useEffect(() => {
    const active = sources.some((s) => s.status === "processing");
    if (!active) return;
    const t = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(t);
  }, [sources, router]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const v = validateFile({ name: file.name, size: file.size });
    if (!v.ok) {
      setError(v.error);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      setStatus("Uploading…");
      const supabase = createClient();
      const path = `${workspaceId}/${chatbotId}/${crypto.randomUUID()}/${sanitizeFilename(file.name)}`;

      const { error: upErr } = await supabase.storage
        .from("knowledge")
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw new Error(upErr.message);

      const reg = await registerFileSource({
        chatbotId,
        storagePath: path,
        filename: file.name,
        byteSize: file.size,
      });
      if (reg.error || !reg.sourceId) throw new Error(reg.error ?? "Could not register file.");

      setStatus("Indexing…");
      router.refresh();
      const proc = await processSourceAction(reg.sourceId);
      if (!proc.ok) throw new Error(proc.error ?? "Indexing failed.");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      setStatus(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleAddUrl() {
    setError(null);
    const v = validateUrl(url);
    if (!v.ok) {
      setError(v.error);
      return;
    }
    setBusy(true);
    try {
      setStatus("Adding URL…");
      const reg = await addUrlSource({ chatbotId, url: v.url });
      if (reg.error || !reg.sourceId) throw new Error(reg.error ?? "Could not add URL.");
      setStatus("Indexing…");
      router.refresh();
      const proc = await processSourceAction(reg.sourceId);
      if (!proc.ok) throw new Error(proc.error ?? "Indexing failed.");
      setUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add URL.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  async function handleRetry(sourceId: string) {
    setRetrying(sourceId);
    try {
      await processSourceAction(sourceId);
      router.refresh();
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="font-semibold">Upload a document</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Allowed: {ALLOWED_EXTENSIONS.join(", ")}. Max {MAX_FILE_BYTES / 1024 / 1024} MB.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")}
            onChange={handleFile}
            disabled={busy}
            className="text-sm"
          />
          {status ? <span className="text-sm text-neutral-500">{status}</span> : null}
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-5">
        <h3 className="font-semibold">Add a web page</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Knovora fetches a single page and indexes its readable text.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={busy}
            placeholder="https://example.com/faq"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddUrl}
            disabled={busy || !url.trim()}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg hover:opacity-90 disabled:opacity-60"
          >
            Add URL
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-semibold">Sources</h3>
        {sources.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-600">
            No sources yet. Upload a document to add knowledge.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.title || s.filename || "Untitled"}</p>
                  <p className="text-xs text-neutral-500">
                    {s.type.toUpperCase()}
                    {s.chunk_count > 0 ? ` · ${s.chunk_count} chunks` : ""}
                    {s.error ? ` · ${s.error}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={s.status} />
                  {s.status === "failed" || s.status === "pending" ? (
                    <button
                      onClick={() => handleRetry(s.id)}
                      disabled={retrying === s.id}
                      className="text-sm text-brand hover:underline disabled:opacity-50"
                    >
                      {retrying === s.id ? "Retrying…" : "Retry"}
                    </button>
                  ) : null}
                  <form action={deleteSource}>
                    <input type="hidden" name="sourceId" value={s.id} />
                    <input type="hidden" name="chatbotId" value={chatbotId} />
                    <button
                      type="submit"
                      className="text-sm text-neutral-400 hover:text-red-600"
                      title="Delete source"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SourceStatus }) {
  const map: Record<SourceStatus, string> = {
    pending: "bg-neutral-100 text-neutral-600",
    processing: "bg-blue-100 text-blue-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>
  );
}
