// End-to-end ingestion verification against a running dev server:
// upload a text file -> /api/ingest -> source becomes ready with chunks ->
// a semantic query retrieves the relevant chunk via match_chunks.
// Env: SB_URL SB_SECRET GEMINI_API_KEY INGEST_SECRET APP_URL
import { GoogleGenAI } from "@google/genai";

const base = process.env.SB_URL;
const secret = process.env.SB_SECRET;
const gem = process.env.GEMINI_API_KEY;
const ingestSecret = process.env.INGEST_SECRET;
const app = process.env.APP_URL || "http://localhost:3000";
for (const [k, v] of Object.entries({ SB_URL: base, SB_SECRET: secret, GEMINI_API_KEY: gem, INGEST_SECRET: ingestSecret })) {
  if (!v) { console.error("Missing", k); process.exit(1); }
}

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const uuid = () => crypto.randomUUID();
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

const CONTENT =
  "Knovora Refund Policy. Customers may return any product within 30 days of purchase for a full refund. " +
  "Shipping is free for orders over 50 dollars. Support is available Monday to Friday, 9am to 5pm.";

async function main() {
  // user + workspace (via signup trigger) + chatbot
  const email = `ingest+${Date.now()}@example.com`;
  const u = await j(await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: adminH, body: JSON.stringify({ email, password: "supersecret123", email_confirm: true }) }));
  const ws = await j(await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${u.id}`, { headers: adminH }));
  const workspaceId = ws[0].id;
  const bot = (await j(await fetch(`${base}/rest/v1/chatbots`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: workspaceId, name: "Ingest Bot", status: "draft", public_id: "i" + uuid().slice(0, 10), appearance: {} }) })))[0];
  const botId = bot.id;

  // upload a .txt to storage (admin bypasses RLS)
  const key = `${workspaceId}/${botId}/${uuid()}/policy.txt`;
  const up = await fetch(`${base}/storage/v1/object/knowledge/${key}`, { method: "POST", headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "text/plain" }, body: CONTENT });
  console.log("Upload:", up.status);

  // insert source + job
  const src = (await j(await fetch(`${base}/rest/v1/sources`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ chatbot_id: botId, workspace_id: workspaceId, type: "file", title: "policy.txt", filename: "policy.txt", storage_path: key, byte_size: CONTENT.length, status: "pending" }) })))[0];
  await fetch(`${base}/rest/v1/ingestion_jobs`, { method: "POST", headers: adminH, body: JSON.stringify({ source_id: src.id, chatbot_id: botId, status: "pending" }) });

  // trigger ingestion via the API route
  const ing = await fetch(`${app}/api/ingest`, { method: "POST", headers: { "Content-Type": "application/json", "x-ingest-secret": ingestSecret }, body: JSON.stringify({ sourceId: src.id }) });
  const ingBody = await j(ing);
  console.log("Ingest response:", ing.status, JSON.stringify(ingBody));

  // check source status + chunk count
  const after = (await j(await fetch(`${base}/rest/v1/sources?select=status,chunk_count,error&id=eq.${src.id}`, { headers: adminH })))[0];
  console.log("Source after:", JSON.stringify(after));

  // retrieval: embed a query and call match_chunks
  const ai = new GoogleGenAI({ apiKey: gem });
  const qr = await ai.models.embedContent({ model: process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001", contents: ["How many days do I have to return a product?"], config: { outputDimensionality: 768, taskType: "RETRIEVAL_QUERY" } });
  let qv = qr.embeddings[0].values;
  // L2 normalize to match stored vectors
  const norm = Math.sqrt(qv.reduce((a, x) => a + x * x, 0)) || 1;
  qv = qv.map((x) => x / norm);

  const match = await j(await fetch(`${base}/rest/v1/rpc/match_chunks`, {
    method: "POST",
    headers: adminH,
    body: JSON.stringify({ p_chatbot_id: botId, p_query_embedding: `[${qv.join(",")}]`, p_match_count: 3 }),
  }));
  console.log("Top match similarity:", match?.[0]?.similarity);
  console.log("Top match content:", match?.[0]?.content?.slice(0, 80));

  // cleanup
  await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: adminH });

  const retrievalOk = Array.isArray(match) && match.length > 0 && /30 days/.test(match[0].content);
  const ok = ingBody?.ok === true && after?.status === "ready" && after?.chunk_count > 0 && retrievalOk;
  console.log(ok ? "\nPASS: ingestion + retrieval verified" : "\nFAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
