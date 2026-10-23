// One-off migration runner using the Supabase Management API.
// Usage: SUPABASE_PAT=sbp_xxx PROJECT_REF=xxx node scripts/apply-migrations.mjs
// Reads SQL from supabase/migrations/*.sql and applies them in filename order.

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PAT = process.env.SUPABASE_PAT;
const REF = process.env.PROJECT_REF;

if (!PAT || !REF) {
  console.error("Missing SUPABASE_PAT or PROJECT_REF env var.");
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "..", "supabase", "migrations");
const endpoint = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function runSql(query) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`Applying ${file} ... `);
    try {
      await runSql(sql);
      console.log("OK");
    } catch (err) {
      console.log("FAILED");
      console.error(String(err.message || err));
      process.exit(1);
    }
  }

  console.log("\n--- Verifying ---");

  const tables = await runSql(
    "select tablename from pg_tables where schemaname='public' order by tablename;",
  );
  console.log(
    "Tables:",
    tables.map((r) => r.tablename).join(", "),
  );

  const rls = await runSql(
    `select relname, relrowsecurity from pg_class
     where relname in ('profiles','workspaces','chatbots','sources','source_chunks',
                       'ingestion_jobs','conversations','messages','usage_events')
     order by relname;`,
  );
  console.log(
    "RLS enabled:",
    rls.map((r) => `${r.relname}=${r.relrowsecurity}`).join(", "),
  );

  const fns = await runSql(
    "select proname from pg_proc where proname in ('match_chunks','handle_new_user','set_updated_at') order by proname;",
  );
  console.log(
    "Functions:",
    fns.map((r) => r.proname).join(", "),
  );

  const ext = await runSql("select extname from pg_extension where extname='vector';");
  console.log("pgvector:", ext.length ? "installed" : "MISSING");

  const bucket = await runSql("select id, public from storage.buckets where id='knowledge';");
  console.log("Storage bucket:", bucket.length ? `knowledge (public=${bucket[0].public})` : "MISSING");

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
