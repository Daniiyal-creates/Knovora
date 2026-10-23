// End-to-end chat verification against the dev server:
// publish a bot with a known doc, then ask a grounded question (expect a cited
// answer) and an off-topic question (expect the fallback). Verify persistence.
// Env: SB_URL SB_SECRET INGEST_SECRET APP_URL
const base = process.env.SB_URL;
const secret = process.env.SB_SECRET;
const ingestSecret = process.env.INGEST_SECRET;
const app = process.env.APP_URL || "http://localhost:3000";

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const uuid = () => crypto.randomUUID();
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

const CONTENT =
  "Knovora Refund Policy. Customers may return any product within 30 days of purchase for a full refund. " +
  "Shipping is free for orders over 50 dollars. Support hours are Monday to Friday, 9am to 5pm.";

async function chat(publicId, sessionId, message) {
  const res = await fetch(`${app}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ publicId, sessionId, message, history: [] }),
  });
  const citationsHeader = res.headers.get("x-citations");
  const citations = citationsHeader ? JSON.parse(Buffer.from(citationsHeader, "base64").toString("utf8")) : [];
  const text = await res.text();
  return { status: res.status, text, citations };
}

async function main() {
  const email = `chat+${Date.now()}@example.com`;
  const u = await j(await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: adminH, body: JSON.stringify({ email, password: "supersecret123", email_confirm: true }) }));
  const ws = await j(await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${u.id}`, { headers: adminH }));
  const workspaceId = ws[0].id;
  const publicId = "c" + uuid().slice(0, 12);
  const bot = (await j(await fetch(`${base}/rest/v1/chatbots`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: workspaceId, name: "Chat Bot", status: "published", public_id: publicId, appearance: {} }) })))[0];

  const key = `${workspaceId}/${bot.id}/${uuid()}/policy.txt`;
  await fetch(`${base}/storage/v1/object/knowledge/${key}`, { method: "POST", headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "text/plain" }, body: CONTENT });
  const src = (await j(await fetch(`${base}/rest/v1/sources`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ chatbot_id: bot.id, workspace_id: workspaceId, type: "file", title: "policy.txt", filename: "policy.txt", storage_path: key, byte_size: CONTENT.length, status: "pending" }) })))[0];
  await fetch(`${base}/rest/v1/ingestion_jobs`, { method: "POST", headers: adminH, body: JSON.stringify({ source_id: src.id, chatbot_id: bot.id, status: "pending" }) });
  const ing = await j(await fetch(`${app}/api/ingest`, { method: "POST", headers: { "Content-Type": "application/json", "x-ingest-secret": ingestSecret }, body: JSON.stringify({ sourceId: src.id }) }));
  console.log("Ingest:", JSON.stringify(ing));

  const session = "sess-" + uuid();

  const grounded = await chat(publicId, session, "How many days do I have to return a product for a refund?");
  console.log("\n[Grounded] status", grounded.status);
  console.log("answer:", grounded.text);
  console.log("citations:", JSON.stringify(grounded.citations));

  const offtopic = await chat(publicId, "sess-" + uuid(), "Who won the 1998 FIFA World Cup?");
  console.log("\n[Off-topic] status", offtopic.status);
  console.log("answer:", offtopic.text);
  console.log("citations:", JSON.stringify(offtopic.citations));

  // persistence runs in the background after the stream closes; give it a moment.
  await new Promise((r) => setTimeout(r, 2500));
  const conv = await j(await fetch(`${base}/rest/v1/conversations?select=id,session_id&chatbot_id=eq.${bot.id}`, { headers: adminH }));
  const usage = await j(await fetch(`${base}/rest/v1/usage_events?select=id,prompt_tokens,completion_tokens,latency_ms&chatbot_id=eq.${bot.id}`, { headers: adminH }));
  const msgs = await j(await fetch(`${base}/rest/v1/messages?select=id,role&order=created_at.asc`, { headers: adminH }));
  console.log("\nConversations:", conv.length, "Usage events:", usage.length, "Messages:", msgs.length);
  console.log("Usage sample:", JSON.stringify(usage[0]));

  await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: adminH });

  const groundedOk = /30/.test(grounded.text) && grounded.citations.length > 0;
  // Fallback: must decline / indicate no info and must NOT invent a World Cup winner.
  const fallbackOk =
    /don'?t have|do not have|not able|no information|limited to/i.test(offtopic.text) &&
    !/france|brazil/i.test(offtopic.text);
  const persistOk = conv.length >= 2 && usage.length >= 2;
  console.log("\ngroundedOk", groundedOk, "fallbackOk", fallbackOk, "persistOk", persistOk);
  const ok = groundedOk && fallbackOk && persistOk;
  console.log(ok ? "PASS: chat engine verified" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
