# Knovora — Local & Cloud Setup

## 1. Prerequisites

- Node 20+ and npm (verified: Node 24, npm 11).
- A Supabase project (created).
- A Google Gemini API key.

## 2. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

| Variable | Where it's used | How to get it |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Supabase → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | browser + server | Supabase → Project Settings → API Keys → Publishable key (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | **server only** | Supabase → Project Settings → API Keys → Secret key (`sb_secret_…`). Never expose to the browser. |
| `GEMINI_API_KEY` | **server only** | https://aistudio.google.com/apikey |
| `NEXT_PUBLIC_APP_URL` | browser + server | `http://localhost:3000` locally; production URL on Vercel |

`GEMINI_EMBEDDING_DIM` (default 768) **must match** the `vector(N)` dimension in
`supabase/migrations/0001_init.sql`. If you change one, change both and re-index.

## 3. Database migrations

Apply the SQL in `supabase/migrations/` in order (`0001` → `0004`).

**Option A — Supabase SQL Editor (quickest, no local tooling):**
Open each file, paste its contents into the SQL Editor, and run them in order.

**Option B — Supabase CLI:**

```bash
# one-time
npx supabase login
npx supabase link --project-ref <your-project-ref>

# apply migrations
npx supabase db push
```

What the migrations create:

- `0001_init.sql` — pgvector extension + all tables + indexes (HNSW vector index).
- `0002_rls.sql` — row-level security so owners only access their own workspace data.
- `0003_functions.sql` — `updated_at` triggers, new-user bootstrap trigger
  (auto-creates a profile + default workspace on signup), and the bot-scoped
  `match_chunks()` similarity-search function.
- `0004_storage.sql` — private `knowledge` storage bucket + per-workspace policies.

## 4. Run locally

```bash
npm install
npm run dev
```

## 5. Useful scripts

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest unit tests
npm run lint        # next lint
npm run build       # production build
```
