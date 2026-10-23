// Run a SQL query via the Supabase Management API.
// Usage: SUPABASE_PAT=.. PROJECT_REF=.. node scripts/sql.mjs "select 1;"
const PAT = process.env.SUPABASE_PAT;
const REF = process.env.PROJECT_REF;
const query = process.argv[2];
if (!PAT || !REF || !query) {
  console.error("Usage: SUPABASE_PAT=.. PROJECT_REF=.. node scripts/sql.mjs \"<sql>\"");
  process.exit(1);
}
const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query }),
});
const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
