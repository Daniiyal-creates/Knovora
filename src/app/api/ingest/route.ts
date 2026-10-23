import { NextResponse } from "next/server";
import { processSource } from "@/lib/ingestion/process";
import { serverEnv } from "@/lib/env";

// Allow longer execution for extraction + embedding.
export const maxDuration = 60;

/**
 * Background ingestion trigger. Fail-closed: requires INGEST_SECRET to be set
 * and matched via the `x-ingest-secret` header. The dashboard UI processes
 * sources via a server action instead; this endpoint exists for programmatic
 * and future async (Inngest/webhook) triggering.
 */
export async function POST(req: Request) {
  const secret = serverEnv().INGEST_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Ingestion endpoint is not configured." }, { status: 503 });
  }
  if (req.headers.get("x-ingest-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { sourceId?: unknown } | null;
  const sourceId = body?.sourceId;
  if (!sourceId || typeof sourceId !== "string") {
    return NextResponse.json({ error: "Missing sourceId." }, { status: 400 });
  }

  const result = await processSource(sourceId);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
