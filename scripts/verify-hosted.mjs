// Verifies the hosted chat page renders for a published bot, 404s otherwise,
// and that the public chat API enforces the per-IP rate limit (20/min).
// Env: SB_URL SB_SECRET APP_URL
const base = process.env.SB_URL;
const secret = process.env.SB_SECRET;
const app = process.env.APP_URL || "http://localhost:3000";

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const uuid = () => crypto.randomUUID();
async function j(r) { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch { return t; } }

async function main() {
  const email = `hosted+${Date.now()}@example.com`;
  const u = await j(await fetch(`${base}/auth/v1/admin/users`, { method: "POST", headers: adminH, body: JSON.stringify({ email, password: "supersecret123", email_confirm: true }) }));
  const ws = await j(await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${u.id}`, { headers: adminH }));
  const publicId = "h" + uuid().slice(0, 12);
  const bot = (await j(await fetch(`${base}/rest/v1/chatbots`, { method: "POST", headers: { ...adminH, Prefer: "return=representation" }, body: JSON.stringify({ workspace_id: ws[0].id, name: "Hosted Zebra Bot", status: "published", public_id: publicId, appearance: { welcomeMessage: "Hello from hosted!" } }) })))[0];

  // hosted page renders
  const pageRes = await fetch(`${app}/chat/${publicId}`);
  const html = await pageRes.text();
  const pageOk = pageRes.status === 200 && html.includes("Hosted Zebra Bot");
  console.log("Hosted page:", pageRes.status, "contains name:", html.includes("Hosted Zebra Bot"));

  // unknown id 404s
  const missing = await fetch(`${app}/chat/does-not-exist-xyz`);
  console.log("Unknown hosted id:", missing.status);

  // rate limit: fire 23 concurrent requests from the same (local) IP
  const reqs = Array.from({ length: 23 }, () =>
    fetch(`${app}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId, sessionId: "rl-" + uuid(), message: "hi there" }) }).then((r) => r.status),
  );
  const statuses = await Promise.all(reqs);
  const ok200 = statuses.filter((s) => s === 200).length;
  const r429 = statuses.filter((s) => s === 429).length;
  console.log("Rate-limit burst: 200s =", ok200, "429s =", r429);

  await fetch(`${base}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: adminH });

  const ok = pageOk && missing.status === 404 && r429 >= 1 && ok200 <= 20;
  console.log(ok ? "\nPASS: hosted page + rate limit verified" : "\nFAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
