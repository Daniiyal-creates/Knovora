// Consolidated security checks:
//  1. Knowledge isolation: bot A must never answer from bot B's documents.
//  2. Allowed-domain enforcement on the public chat API.
// Env: SB_URL SB_SECRET INGEST_SECRET APP_URL
const base = process.env.SB_URL;
const secret = process.env.SB_SECRET;
const ingestSecret = process.env.INGEST_SECRET;
const app = process.env.APP_URL || "http://localhost:3000";

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const uuid = () => crypto.randomUUID();
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

async function makeBot(workspaceId, name, content) {
  const publicId = "s" + uuid().slice(0, 12);
  const bot = (await j(await fetch(`${base}/rest/v1/chatbots`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: workspaceId, name, status: "published", public_id: publicId, appearance: {} }) })))[0];
  const key = `${workspaceId}/${bot.id}/${uuid()}/doc.txt`;
  await fetch(`${base}/storage/v1/object/knowledge/${key}`, { method: "POST", headers: { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "text/plain" }, body: content });
  const src = (await j(await fetch(`${base}/rest/v1/sources`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ chatbot_id: bot.id, workspace_id: workspaceId, type: "file", title: "doc.txt", filename: "doc.txt", storage_path: key, byte_size: content.length, status: "pending" }) })))[0];
  await fetch(`${base}/rest/v1/ingestion_jobs`, { method: "POST", headers: adminH, body: JSON.stringify({ source_id: src.id, chatbot_id: bot.id, status: "pending" }) });
  await j(await fetch(`${app}/api/ingest`, { method: "POST", headers: { "Content-Type": "application/json", "x-ingest-secret": ingestSecret }, body: JSON.stringify({ sourceId: src.id }) }));
  return bot;
}

async function ask(publicId, message, origin) {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers["Origin"] = origin;
  const res = await fetch(`${app}/api/chat`, { method: "POST", headers, body: JSON.stringify({ publicId, sessionId: "sec-" + uuid(), message, history: [] }) });
  const text = res.status === 200 ? await res.text() : "";
  return { status: res.status, text };
}

async function main() {
  const email = `sec+${Date.now()}@example.com`;
  const u = await j(await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: adminH, body: JSON.stringify({ email, password: "supersecret123", email_confirm: true }) }));
  const ws = await j(await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${u.id}`, { headers: adminH }));
  const workspaceId = ws[0].id;

  const botA = await makeBot(workspaceId, "Bot A", "Knovora refund policy: returns accepted within 30 days of purchase.");
  const botB = await makeBot(workspaceId, "Bot B", "Acme Corporation was founded in 1999 in the city of Berlin.");

  // Isolation: Bot A asked about Bot B's content must not leak it.
  const aAboutB = await ask(botA.public_id, "When and where was Acme Corporation founded?");
  const bAboutA = await ask(botB.public_id, "How many days do I have to return a product?");
  const aAboutA = await ask(botA.public_id, "How many days do I have to return a product?");

  console.log("A about B:", aAboutB.text);
  console.log("B about A:", bAboutA.text);
  console.log("A about A:", aAboutA.text);

  const isolationOk =
    !/1999|berlin/i.test(aAboutB.text) && !/30 days|30/i.test(bAboutA.text) && /30/.test(aAboutA.text);

  // Allowed-domain enforcement on Bot A.
  await fetch(`${base}/rest/v1/chatbots?id=eq.${botA.id}`, { method: "PATCH", headers: adminH, body: JSON.stringify({ allowed_domains: ["example.com"] }) });
  const fromEvil = await ask(botA.public_id, "hi", "https://evil.com");
  const fromApp = await ask(botA.public_id, "hi", app); // app origin == localhost
  console.log("From evil.com origin:", fromEvil.status, "| From app origin:", fromApp.status);

  await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: adminH });

  const domainOk = fromEvil.status === 403 && fromApp.status === 200;
  console.log("\nisolationOk", isolationOk, "domainOk", domainOk);
  const ok = isolationOk && domainOk;
  console.log(ok ? "PASS: isolation + allowed-domain verified" : "FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
