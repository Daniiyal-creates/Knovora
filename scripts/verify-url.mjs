// Verifies URL ingestion: add a public page as a source -> /api/ingest ->
// source becomes ready with chunks. Env: SB_URL SB_SECRET INGEST_SECRET APP_URL
const base = process.env.SB_URL;
const secret = process.env.SB_SECRET;
const ingestSecret = process.env.INGEST_SECRET;
const app = process.env.APP_URL || "http://localhost:3000";
const TEST_URL = process.env.TEST_URL || "https://example.com/";

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const uuid = () => crypto.randomUUID();
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

const email = `url+${Date.now()}@example.com`;
const u = await j(await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: adminH, body: JSON.stringify({ email, password: "supersecret123", email_confirm: true }) }));
const ws = await j(await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${u.id}`, { headers: adminH }));
const workspaceId = ws[0].id;
const bot = (await j(await fetch(`${base}/rest/v1/chatbots`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: workspaceId, name: "URL Bot", status: "draft", public_id: "u" + uuid().slice(0, 10), appearance: {} }) })))[0];

const src = (await j(await fetch(`${base}/rest/v1/sources`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ chatbot_id: bot.id, workspace_id: workspaceId, type: "url", title: new URL(TEST_URL).hostname, url: TEST_URL, status: "pending" }) })))[0];
await fetch(`${base}/rest/v1/ingestion_jobs`, { method: "POST", headers: adminH, body: JSON.stringify({ source_id: src.id, chatbot_id: bot.id, status: "pending" }) });

const ing = await fetch(`${app}/api/ingest`, { method: "POST", headers: { "Content-Type": "application/json", "x-ingest-secret": ingestSecret }, body: JSON.stringify({ sourceId: src.id }) });
const ingBody = await j(ing);
console.log("Ingest:", ing.status, JSON.stringify(ingBody));

const after = (await j(await fetch(`${base}/rest/v1/sources?select=status,chunk_count,error&id=eq.${src.id}`, { headers: adminH })))[0];
console.log("Source after:", JSON.stringify(after));

await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: adminH });

const ok = ingBody?.ok === true && after?.status === "ready" && after?.chunk_count > 0;
console.log(ok ? "\nPASS: URL ingestion verified" : "\nFAIL");
process.exit(ok ? 0 : 1);
