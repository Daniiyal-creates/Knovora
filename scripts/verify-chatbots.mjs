// Verifies chatbot CRUD under RLS using a real signed-in user session
// (the same path the dashboard UI uses). Creates a throwaway user, signs in,
// and performs insert/list/update/delete as that user, then cleans up.
// Usage: SB_URL=.. SB_PUB=.. SB_SECRET=.. node scripts/verify-chatbots.mjs

const base = process.env.SB_URL;
const pub = process.env.SB_PUB;
const secret = process.env.SB_SECRET;
if (!base || !pub || !secret) {
  console.error("Missing SB_URL / SB_PUB / SB_SECRET");
  process.exit(1);
}

const adminH = { apikey: secret, Authorization: `Bearer ${secret}`, "Content-Type": "application/json" };
const email = `botcrud+${Date.now()}@example.com`;
const password = "supersecret123";

const pid = () => "p" + Math.random().toString(36).slice(2, 12);

async function j(res) {
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

async function main() {
  // 1. create + confirm user
  const u = await j(
    await fetch(`${base}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminH,
      body: JSON.stringify({ email, password, email_confirm: true }),
    }),
  );
  const uid = u.id;
  console.log("User:", uid);

  // 2. sign in -> access token
  const tok = await j(
    await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: pub, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),
  );
  const userH = { apikey: pub, Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" };

  // 3. fetch the user's workspace (created by the signup trigger)
  const ws = await j(
    await fetch(`${base}/rest/v1/workspaces?select=id&owner_id=eq.${uid}`, { headers: userH }),
  );
  const workspaceId = ws[0].id;
  console.log("Workspace:", workspaceId);

  // 4. INSERT a chatbot as the user (RLS WITH CHECK must allow)
  const ins = await fetch(`${base}/rest/v1/chatbots`, {
    method: "POST",
    headers: { ...userH, Prefer: "return=representation" },
    body: JSON.stringify({
      workspace_id: workspaceId,
      name: "Verify Bot",
      status: "draft",
      public_id: pid(),
      appearance: {},
    }),
  });
  const created = await j(ins);
  if (!ins.ok) {
    console.error("INSERT failed:", created);
    process.exit(1);
  }
  const botId = created[0].id;
  console.log("Inserted chatbot:", botId, "status=" + created[0].status);

  // 5. LIST
  const list = await j(
    await fetch(`${base}/rest/v1/chatbots?select=id,name,status&workspace_id=eq.${workspaceId}`, {
      headers: userH,
    }),
  );
  console.log("List count:", list.length);

  // 6. UPDATE
  const upd = await fetch(`${base}/rest/v1/chatbots?id=eq.${botId}`, {
    method: "PATCH",
    headers: { ...userH, Prefer: "return=representation" },
    body: JSON.stringify({ status: "published", name: "Verify Bot v2" }),
  });
  const updated = await j(upd);
  console.log("Updated:", updated[0].name, updated[0].status);

  // 7. Cross-tenant check: a second user must NOT see this bot.
  const email2 = `other+${Date.now()}@example.com`;
  const u2 = await j(
    await fetch(`${base}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminH,
      body: JSON.stringify({ email: email2, password, email_confirm: true }),
    }),
  );
  const tok2 = await j(
    await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: pub, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email2, password }),
    }),
  );
  const user2H = { apikey: pub, Authorization: `Bearer ${tok2.access_token}` };
  const leak = await j(
    await fetch(`${base}/rest/v1/chatbots?select=id&id=eq.${botId}`, { headers: user2H }),
  );
  const isolationOk = Array.isArray(leak) && leak.length === 0;
  console.log("Isolation (other user sees 0 rows):", isolationOk ? "PASS" : "FAIL");

  // 8. DELETE
  const del = await fetch(`${base}/rest/v1/chatbots?id=eq.${botId}`, {
    method: "DELETE",
    headers: userH,
  });
  console.log("Delete status:", del.status);

  // cleanup
  await fetch(`${base}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: adminH });
  await fetch(`${base}/auth/v1/admin/users/${u2.id}`, { method: "DELETE", headers: adminH });

  const ok =
    created[0].status === "draft" &&
    list.length === 1 &&
    updated[0].status === "published" &&
    isolationOk &&
    del.ok;
  console.log(ok ? "\nPASS: chatbot CRUD + RLS isolation verified" : "\nFAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
