# Knovora MVP — Implementation Plan & Checklist

Core happy-path vertical slice: sign up → create bot → upload PDF/URL → RAG chat with citations → publish (hosted page + embed widget).

## Decisions
- **Stack:** Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + pgvector, Auth, Storage), Gemini via `@google/genai`, Vercel hosting.
- **Embeddings:** Gemini `gemini-embedding-001` behind a swappable `EmbeddingProvider` interface (migration path to local model later). Default chat model `gemini-2.5-flash`, configurable.
- **Ingestion:** Background route handler + `ingestion_jobs` status rows + retry. Inngest deferred.
- **Auth:** Email+password signup/login + session. No email verification / password reset yet.
- **Testing:** Lightweight — unit tests on core logic (chunking, retrieval, prompt assembly, embedding client) + manual UI verification.

## Checklist

- [x] **Task 1 — Scaffolding, tooling, CI.** Next.js + TS + Tailwind, lint/format, Vitest, typed env schema (`zod`), base layout, Vercel link + preview deploys.
- [x] **Task 2 — Supabase schema, pgvector, RLS.** _(applied + verified live: 9 tables, RLS on all, match_chunks, pgvector, storage bucket)_ Tables, `vector` extension + index, RLS policies, `match_chunks()` SQL function, in-repo migrations.
- [x] **Task 3 — Auth + workspace bootstrap.** _(verified live: signup trigger creates profile + workspace; email auto-confirm enabled)_ Email/password signup/login, session-aware routing, auto profile + default workspace.
- [x] **Task 4 — Chatbot CRUD + config.** _(verified live: create/list/update/delete under RLS + cross-tenant isolation; app boots, routes + auth guard OK)_ Create/edit/list/delete, config form, default system instructions, draft/published, public id.
- [x] **Task 5 — Direct file upload to Storage + source records.** _(verified live: owner upload OK, cross-tenant blocked, source+job rows created; fixed a storage-policy name-binding bug — migration 0005)_ Private bucket, signed/direct upload, size/type limits, `source` + `ingestion_jobs` rows.
- [x] **Task 6 — Ingestion pipeline.** _(verified live: txt upload → ready, 1 chunk; semantic query retrieved correct passage. pdf-parse pinned to 1.1.1; /api/ingest route added)_ Parse (pdf-parse) → normalize → chunk → Gemini embed → store `source_chunks`; idempotent, retry, status transitions.
- [x] **Task 7 — URL ingestion.** _(verified live: example.com fetched + indexed to ready; SSRF guard + content-type/size limits)_ Single-page fetch + extract (Cheerio/Readability), reuse pipeline.
- [x] **Task 8 — RAG retrieval + context assembly.** _(retrieval service + numbered-citation prompt builder + fallback; unit-tested, scoping verified via match_chunks)_ Query embedding, bot-scoped pgvector search, grounded prompt + guardrails + citation ids.
- [x] **Task 9 — Gemini chat engine.** _(verified live: streamed grounded answer + citation, off-topic fallback, usage logging + persistence; /api/chat preview+public modes)_ Streaming route, limited memory, unknown-answer fallback, citations, usage logging, retries/timeouts.
- [x] **Task 10 — In-dashboard test/preview mode.** _(reusable ChatBox with streaming + citations + reset; preview auth gate verified 401/400/404)_ Owner live preview, source visibility, reset session.
- [x] **Task 11 — Appearance customization.** _(theme/avatar/welcome/starters/position with live preview + validation; unit-tested)_ Name, theme, avatar, greeting, starter prompts, widget position.
- [x] **Task 12 — Hosted public chat page.** _(verified live: /chat/[publicId] renders for published bots, 404s otherwise; per-IP rate limit 20/min enforced; publish tab shows hosted link)_ `/chat/[publicId]` for published bots, public chat API, rate limiting.
- [x] **Task 13 — Embed widget + snippet.** _(verified: widget.js served as JS; jsdom tests confirm button + lazy iframe to hosted chat; snippet on publish tab)_ Isolated CDN JS bundle, copy-paste snippet, CSP-safe, credential-free.
- [x] **Task 14 — Security/abuse baseline + happy-path wiring.** _(verified live: cross-bot knowledge isolation + allowed-domain 403/200; RLS, rate limits, SSRF, file limits, server-only secrets all confirmed earlier)_ Rate limits, file caps, allowed-domain checks, isolation verification, full E2E.
- [x] **Task 15 — Production deployment.** _(deployment-ready: prod build passes, DEPLOYMENT.md guide + env checklist + smoke tests. Actual Vercel deploy requires your GitHub/Vercel accounts — see DEPLOYMENT.md)_ Locked-down Vercel prod, secrets, migrations, domain/TLS, smoke test.

## Deferred (next phase)
Inngest orchestration, analytics + helpfulness votes, lead capture + CSV export, admin panel, email verification/password reset, OAuth, team roles, subscriptions, multi-page crawling, local embeddings migration.
