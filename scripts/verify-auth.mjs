// Verifies the handle_new_user trigger: creating an auth user should
// auto-create a profile and a default workspace.
// Usage: SB_URL=.. SB_SECRET=.. node scripts/verify-auth.mjs

const base = process.env.SB_URL;
const secret = process.env.SB_SECRET;
if (!base || !secret) {
  console.error("Missing SB_URL or SB_SECRET");
  process.exit(1);
}

const h = {
  apikey: secret,
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
};

const email = `triggertest+${Date.now()}@example.com`;

async function main() {
  // 1. create user
  const createRes = await fetch(`${base}/auth/v1/admin/users`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ email, password: "supersecret123", email_confirm: true }),
  });
  const user = await createRes.json();
  if (!createRes.ok) {
    console.error("Create user failed:", user);
    process.exit(1);
  }
  const uid = user.id;
  console.log("Created user:", uid, email);

  // small delay to let the trigger commit
  await new Promise((r) => setTimeout(r, 500));

  // 2. check profile
  const prof = await (
    await fetch(`${base}/rest/v1/profiles?select=id,email&id=eq.${uid}`, { headers: h })
  ).json();
  console.log("Profile rows:", JSON.stringify(prof));

  // 3. check workspace
  const ws = await (
    await fetch(`${base}/rest/v1/workspaces?select=id,name,owner_id&owner_id=eq.${uid}`, {
      headers: h,
    })
  ).json();
  console.log("Workspace rows:", JSON.stringify(ws));

  const ok = Array.isArray(prof) && prof.length === 1 && Array.isArray(ws) && ws.length === 1;
  console.log(ok ? "\nPASS: trigger created profile + workspace" : "\nFAIL: bootstrap incomplete");

  // 4. cleanup: deleting the auth user cascades to profile + workspace
  await fetch(`${base}/auth/v1/admin/users/${uid}`, { method: "DELETE", headers: h });
  console.log("Cleaned up test user.");

  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
