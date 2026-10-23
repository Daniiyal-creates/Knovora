# Knovora — Production Deployment (Vercel)

The app is production-ready: `npm run build` passes, all routes work, and the
Supabase schema is applied. Deploying requires your own GitHub + Vercel
accounts. Follow these steps.

## 1. Push to GitHub

```bash
git remote add origin https://github.com/<you>/knovora.git
git push -u origin main
```

`.env.local` is gitignored, so your secrets are not pushed.

## 2. Import into Vercel

1. Vercel → **Add New → Project** → import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Build command and output are
   the defaults. No `vercel.json` is needed.
3. Add the environment variables below (Project → Settings → Environment
   Variables) for **Production** (and Preview if you want PR deploys).

### Environment variables

| Variable | Scope | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | all | your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all | `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | **server only** | `sb_secret_…` |
| `GEMINI_API_KEY` | **server only** | your Gemini key |
| `GEMINI_CHAT_MODEL` | server | `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | server | `gemini-embedding-001` |
| `GEMINI_EMBEDDING_DIM` | server | `768` (must match the `vector(768)` column) |
| `INGEST_SECRET` | server | a long random string |
| `NEXT_PUBLIC_APP_URL` | all | set after first deploy (see step 4) |

Vercel does not distinguish server-only vs public beyond the `NEXT_PUBLIC_`
prefix; the non-prefixed vars are never sent to the browser.

## 3. First deploy

Click **Deploy**. Vercel builds and assigns a URL like
`https://knovora-xxxx.vercel.app`.

## 4. Set the app URL and redeploy

1. Set `NEXT_PUBLIC_APP_URL` to the assigned production URL (and your custom
   domain once attached).
2. Redeploy so hosted-chat links and the embed snippet use the right origin.

## 5. Supabase configuration

- **Migrations** are already applied to the current project. If you use a
  separate production Supabase project, apply them there:
  ```bash
  SUPABASE_PAT=sbp_… PROJECT_REF=<ref> node scripts/apply-migrations.mjs
  SUPABASE_PAT=sbp_… PROJECT_REF=<ref> node scripts/set-auth-config.mjs
  ```
- **Auth URLs**: Supabase → Authentication → URL Configuration → set the Site
  URL to your production domain.

## 6. Function limits

The chat and ingest routes set `maxDuration = 60`. Confirm your Vercel plan
allows a 60s function duration (Hobby supports up to 60s). Large PDFs may need
the async upgrade below.

## 7. Post-deploy smoke test (MVP acceptance)

- [ ] Sign up, land on the dashboard with a workspace.
- [ ] Create a chatbot; upload a PDF and add a URL; both reach **ready**.
- [ ] Preview: ask a grounded question → cited answer; ask an off-topic one →
      explicit "I don't have that information".
- [ ] Publish; open the hosted `/chat/<publicId>` link on mobile + desktop.
- [ ] Paste the embed snippet into a test HTML page; the bubble opens and chats.
- [ ] Confirm a visitor on bot A cannot get bot B's answers.
- [ ] Check Supabase: conversations, messages, and usage_events are recorded.

## Known post-MVP upgrades

- Replace the synchronous ingestion trigger with **Inngest** for large files and
  retries beyond the function timeout (the `/api/ingest` route is ready to be
  called from a job).
- Back the rate limiter with a shared store (e.g. Upstash Redis) so limits hold
  across serverless instances.
- Add a separate production Supabase project and least-privilege keys.
