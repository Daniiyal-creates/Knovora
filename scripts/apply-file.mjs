// Apply a single SQL file via the Supabase Management API.
// Usage: SUPABASE_PAT=.. PROJECT_REF=.. node scripts/apply-file.mjs supabase/migrations/0005_fix_storage_policies.sql
import { readFileSync } from "node:fs";

const PAT = process.env.SUPABASE_PAT;
const REF = process.env.PROJECT_REF;
const file = process.argv[2];
if (!PAT || !REF || !file) {
  console.error("Usage: SUPABASE_PAT=.. PROJECT_REF=.. node scripts/apply-file.mjs <file.sql>");
  process.exit(1);
}
const sql = readFileSync(file, "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const text = await res.text();
console.log("HTTP", res.status, res.ok ? "OK" : "FAILED");
if (!res.ok) console.log(text);
process.exit(res.ok ? 0 : 1);
