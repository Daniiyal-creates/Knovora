// Configures project auth for the MVP slice: auto-confirm emails (no email
// verification step) so signUp returns a session immediately.
// Usage: SUPABASE_PAT=.. PROJECT_REF=.. node scripts/set-auth-config.mjs

const PAT = process.env.SUPABASE_PAT;
const REF = process.env.PROJECT_REF;
if (!PAT || !REF) {
  console.error("Missing SUPABASE_PAT or PROJECT_REF");
  process.exit(1);
}

const endpoint = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const headers = { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" };

async function main() {
  const patch = await fetch(endpoint, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ mailer_autoconfirm: true }),
  });
  const text = await patch.text();
  if (!patch.ok) {
    console.error(`Failed: HTTP ${patch.status}: ${text}`);
    process.exit(1);
  }
  const cfg = JSON.parse(text);
  console.log("mailer_autoconfirm is now:", cfg.mailer_autoconfirm);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
