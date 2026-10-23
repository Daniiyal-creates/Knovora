// Verifies Storage RLS + source/job row creation.
// - Owner can upload into their own workspace folder.
// - A different user cannot upload into that folder.
// - Owner can insert source + ingestion_jobs rows.
// Usage: SB_URL=.. SB_PUB=.. SB_SECRET=.. node scripts/verify-upload.mjs

const base = process.env.SB_URL;
const pub = process.env.SB_PUB;
const secret = process.env.SB_SECRET;
if (!base || !pub || !secret) {
  console.error("Missing env");
  process.exit(1);
}

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const pw = "supersecret123";
const uuid = () => crypto.randomUUID();

async function j(res) {
  const t = await res.text();
  try {
    return t ? JSON.parse(t) : null;
  } catch {
    return t;
  }
}

async function makeUser(email) {
  const u = await j(
    await fetch(`${base}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminH,
      body: JSON.stringify({ email, password: pw, email_confirm: true }),
    }),
  );
  const tok = await j(
    await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: pub, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pw }),
    }),
  );
  return { id: u.id, token: tok.access_token };
}

async function workspaceOf(userId, token) {
  const ws = await j(
    await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${userId}`, {
      headers: { apikey: pub, Authorization: `Bearer ${token}` },
    }),
  );
  return ws[0].id;
}

async function uploadText(path, token, text) {
  const res = await fetch(`${base}/storage/v1/object/knowledge/${path}`, {
    method: "POST",
    headers: { apikey: pub, Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
    body: text,
  });
  return res.status;
}

async function main() {
  const a = await makeUser(`upA+${Date.now()}@example.com`);
  const b = await makeUser(`upB+${Date.now()}@example.com`);
  const wsA = await workspaceOf(a.id, a.token);
  console.log("User A workspace:", wsA);

  // chatbot for A
  const botRes = await fetch(`${base}/rest/v1/chatbots`, {
    method: "POST",
    headers: { apikey: pub, Authorization: `Bearer ${a.token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ workspace_id: wsA, name: "Upload Bot", status: "draft", public_id: "u" + uuid().slice(0, 10), appearance: {} }),
  });
  const bot = (await j(botRes))[0];
  const botId = bot.id;

  const key = `${wsA}/${botId}/${uuid()}/test.txt`;

  // 1. owner upload -> expect 200
  const ownerStatus = await uploadText(key, a.token, "hello knovora");
  console.log("Owner upload status:", ownerStatus, ownerStatus === 200 ? "PASS" : "FAIL");

  // 2. other user upload into A's folder -> expect 4xx
  const otherKey = `${wsA}/${botId}/${uuid()}/evil.txt`;
  const otherStatus = await uploadText(otherKey, b.token, "should be blocked");
  console.log("Cross-tenant upload status:", otherStatus, otherStatus >= 400 ? "PASS (blocked)" : "FAIL (allowed!)");

  // 3. owner inserts source + job
  const srcRes = await fetch(`${base}/rest/v1/sources`, {
    method: "POST",
    headers: { apikey: pub, Authorization: `Bearer ${a.token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ chatbot_id: botId, workspace_id: wsA, type: "file", title: "test.txt", filename: "test.txt", storage_path: key, byte_size: 13, status: "pending" }),
  });
  const src = (await j(srcRes))[0];
  const srcOk = srcRes.ok && src?.status === "pending";
  console.log("Source insert:", srcRes.status, srcOk ? "PASS" : "FAIL");

  const jobRes = await fetch(`${base}/rest/v1/ingestion_jobs`, {
    method: "POST",
    headers: { apikey: pub, Authorization: `Bearer ${a.token}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({ source_id: src.id, chatbot_id: botId, status: "pending" }),
  });
  console.log("Job insert:", jobRes.status, jobRes.ok ? "PASS" : "FAIL");

  // cleanup
  await fetch(`${base}/auth/v1/admin/users/${a.id}`, { method: "DELETE", headers: adminH });
  await fetch(`${base}/auth/v1/admin/users/${b.id}`, { method: "DELETE", headers: adminH });

  const ok = ownerStatus === 200 && otherStatus >= 400 && srcOk && jobRes.ok;
  console.log(ok ? "\nPASS: storage RLS + source/job creation verified" : "\nFAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
